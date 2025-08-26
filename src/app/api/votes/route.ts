import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schemas
const VoteSchema = z.object({
  resource_id: z.string().uuid(),
  vote_type: z.enum(['up', 'down']),
});

const VoteQuerySchema = z.object({
  resource_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
});

// POST /api/votes - Submit or update vote
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const voteData = VoteSchema.parse(body);

    const supabase = createServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if resource exists and is approved/pending
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id, status, submitted_by')
      .eq('id', voteData.resource_id)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    if (!['approved', 'pending'].includes(resource.status)) {
      return NextResponse.json(
        { error: 'Cannot vote on this resource' },
        { status: 400 }
      );
    }

    // Prevent users from voting on their own submissions
    if (resource.submitted_by === user.id) {
      return NextResponse.json(
        { error: 'Cannot vote on your own submission' },
        { status: 400 }
      );
    }

    // Get user's reputation to calculate vote weight
    const { data: userProfile } = await supabase
      .from('users')
      .select('reputation_score')
      .eq('id', user.id)
      .single();

    const reputationScore = userProfile?.reputation_score || 0;
    const voteWeight = Math.min((reputationScore * 0.1) + 1, 5.0); // Max weight of 5.0

    // Check if user has already voted on this resource
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, vote_type')
      .eq('resource_id', voteData.resource_id)
      .eq('user_id', user.id)
      .single();

    let voteResult;

    if (existingVote) {
      if (existingVote.vote_type === voteData.vote_type) {
        // Remove vote if clicking the same vote type
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          console.error('Error removing vote:', deleteError);
          return NextResponse.json(
            { error: 'Failed to remove vote' },
            { status: 500 }
          );
        }

        voteResult = { action: 'removed', vote_type: null };
      } else {
        // Update existing vote to new type
        const { data: updatedVote, error: updateError } = await supabase
          .from('votes')
          .update({
            vote_type: voteData.vote_type,
            weight: voteWeight,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingVote.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating vote:', updateError);
          return NextResponse.json(
            { error: 'Failed to update vote' },
            { status: 500 }
          );
        }

        voteResult = { action: 'updated', vote_type: voteData.vote_type, vote: updatedVote };
      }
    } else {
      // Create new vote
      const { data: newVote, error: insertError } = await supabase
        .from('votes')
        .insert({
          resource_id: voteData.resource_id,
          user_id: user.id,
          vote_type: voteData.vote_type,
          weight: voteWeight,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating vote:', insertError);
        return NextResponse.json(
          { error: 'Failed to create vote' },
          { status: 500 }
        );
      }

      voteResult = { action: 'created', vote_type: voteData.vote_type, vote: newVote };
    }

    // Get updated vote counts and quality score
    const { data: qualityData } = await supabase
      .rpc('calculate_quality_score', { resource_id: voteData.resource_id });

    if (qualityData && qualityData.length > 0) {
      const scoreResult = qualityData[0];

      // Update resource with new scores
      await supabase
        .from('resources')
        .update({
          upvotes: scoreResult.upvotes,
          downvotes: scoreResult.downvotes,
          quality_score: scoreResult.weighted_score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', voteData.resource_id);

      // Check for auto-approval/hiding
      if (resource.status === 'pending') {
        if (scoreResult.should_auto_approve) {
          await supabase
            .from('resources')
            .update({ status: 'approved' })
            .eq('id', voteData.resource_id);

          // Track analytics event
          await supabase
            .from('analytics_events')
            .insert({
              event_type: 'resource_auto_approved',
              resource_id: voteData.resource_id,
              properties: {
                quality_score: scoreResult.weighted_score,
                voter_count: scoreResult.voter_count,
              },
            });
        } else if (scoreResult.should_auto_hide) {
          await supabase
            .from('resources')
            .update({ status: 'hidden' })
            .eq('id', voteData.resource_id);

          // Track analytics event
          await supabase
            .from('analytics_events')
            .insert({
              event_type: 'resource_auto_hidden',
              resource_id: voteData.resource_id,
              properties: {
                quality_score: scoreResult.weighted_score,
                voter_count: scoreResult.voter_count,
              },
            });
        }
      }
    }

    // Update user vote counts
    if (voteResult.action === 'created') {
      const updateField = voteData.vote_type === 'up' ? 'total_upvotes' : 'total_downvotes';
      await supabase
        .from('users')
        .update({
          [updateField]: supabase.raw(`${updateField} + 1`),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    // Track analytics event
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'vote_cast',
        user_id: user.id,
        resource_id: voteData.resource_id,
        properties: {
          vote_type: voteData.vote_type,
          action: voteResult.action,
          vote_weight: voteWeight,
        },
      });

    return NextResponse.json({
      data: voteResult,
      message: `Vote ${voteResult.action} successfully`,
    });
  } catch (error) {
    console.error('Vote submission error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid vote data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/votes - Get vote information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = VoteQuerySchema.parse(Object.fromEntries(searchParams));

    const supabase = createServerClient();

    if (query.resource_id && query.user_id) {
      // Get specific user's vote for a resource
      const { data: vote, error } = await supabase
        .from('votes')
        .select('vote_type, weight, created_at')
        .eq('resource_id', query.resource_id)
        .eq('user_id', query.user_id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching vote:', error);
        return NextResponse.json(
          { error: 'Failed to fetch vote' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: vote || null,
      });
    } else if (query.resource_id) {
      // Get vote summary for a resource
      const { data: qualityData } = await supabase
        .rpc('calculate_quality_score', { resource_id: query.resource_id });

      if (!qualityData || qualityData.length === 0) {
        return NextResponse.json({
          data: {
            upvotes: 0,
            downvotes: 0,
            weighted_score: 0,
            voter_count: 0,
          },
        });
      }

      const scoreResult = qualityData[0];

      // Get recent voters for display
      const { data: recentVoters } = await supabase
        .from('votes')
        .select(`
          vote_type,
          weight,
          created_at,
          user:users(username, display_name, avatar_url, reputation_score)
        `)
        .eq('resource_id', query.resource_id)
        .order('created_at', { ascending: false })
        .limit(10);

      return NextResponse.json({
        data: {
          upvotes: scoreResult.upvotes,
          downvotes: scoreResult.downvotes,
          weighted_score: scoreResult.weighted_score,
          voter_count: scoreResult.voter_count,
          should_auto_approve: scoreResult.should_auto_approve,
          should_auto_hide: scoreResult.should_auto_hide,
          recent_voters: recentVoters || [],
        },
      });
    } else if (query.user_id) {
      // Get user's recent votes
      const { data: userVotes, error } = await supabase
        .from('votes')
        .select(`
          vote_type,
          weight,
          created_at,
          resource:resources(id, title, category, quality_score)
        `)
        .eq('user_id', query.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching user votes:', error);
        return NextResponse.json(
          { error: 'Failed to fetch user votes' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: userVotes || [],
      });
    } else {
      return NextResponse.json(
        { error: 'resource_id or user_id parameter required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Vote query error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/votes - Remove vote
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resource_id');

    if (!resourceId) {
      return NextResponse.json(
        { error: 'resource_id parameter required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find and delete user's vote
    const { data: deletedVote, error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('resource_id', resourceId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (deleteError) {
      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No vote found to delete' },
          { status: 404 }
        );
      }

      console.error('Error deleting vote:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete vote' },
        { status: 500 }
      );
    }

    // Update user vote counts
    const updateField = deletedVote.vote_type === 'up' ? 'total_upvotes' : 'total_downvotes';
    await supabase
      .from('users')
      .update({
        [updateField]: supabase.raw(`GREATEST(${updateField} - 1, 0)`),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Track analytics event
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'vote_removed',
        user_id: user.id,
        resource_id: resourceId,
        properties: {
          vote_type: deletedVote.vote_type,
        },
      });

    return NextResponse.json({
      message: 'Vote removed successfully',
    });
  } catch (error) {
    console.error('Vote deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

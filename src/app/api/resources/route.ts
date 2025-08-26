import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schemas
const ResourceSubmissionSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().max(100).optional(),
  url: z.string().url(),
  description: z.string().max(1000).optional(),
  category: z.enum(['books', 'articles', 'videos', 'tools', 'research', 'philosophy']),
  tags: z.array(z.string()).max(10).optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimated_time_minutes: z.number().int().min(1).max(10080).optional(), // Max 1 week
  submission_tx_hash: z.string().optional(),
  submission_amount: z.number().optional(),
});

const ResourcesQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'hidden']).optional().default('approved'),
  category: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  order_by: z.enum(['trending_score', 'quality_score', 'created_at', 'views']).optional().default('trending_score'),
  order_direction: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional().default(20),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional().default(0),
  search: z.string().optional(),
  featured: z.string().transform(s => s === 'true').optional(),
  user_id: z.string().uuid().optional(), // For user-specific queries
});

// GET /api/resources - Fetch resources with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = ResourcesQuerySchema.parse(Object.fromEntries(searchParams));

    const supabase = createServerClient();

    let dbQuery = supabase
      .from('resources')
      .select(`
        *,
        submitted_by:users(id, username, display_name, avatar_url, reputation_score),
        votes_summary:votes(vote_type, count),
        user_vote:votes!left(vote_type)
      `)
      .eq('status', query.status);

    // Apply filters
    if (query.category) {
      dbQuery = dbQuery.eq('category', query.category);
    }

    if (query.tags) {
      const tagArray = query.tags.split(',').map(tag => tag.trim());
      dbQuery = dbQuery.overlaps('tags', tagArray);
    }

    if (query.difficulty) {
      dbQuery = dbQuery.eq('difficulty_level', query.difficulty);
    }

    if (query.featured !== undefined) {
      dbQuery = dbQuery.eq('featured', query.featured);
    }

    if (query.search) {
      // Full-text search on title, description, and author
      dbQuery = dbQuery.or(
        `title.ilike.%${query.search}%,description.ilike.%${query.search}%,author.ilike.%${query.search}%`
      );
    }

    // Apply ordering
    dbQuery = dbQuery.order(query.order_by, { ascending: query.order_direction === 'asc' });

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data: resources, error } = await dbQuery;

    if (error) {
      console.error('Error fetching resources:', error);
      return NextResponse.json(
        { error: 'Failed to fetch resources' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('status', query.status);

    if (query.category) countQuery = countQuery.eq('category', query.category);
    if (query.tags) {
      const tagArray = query.tags.split(',').map(tag => tag.trim());
      countQuery = countQuery.overlaps('tags', tagArray);
    }
    if (query.difficulty) countQuery = countQuery.eq('difficulty_level', query.difficulty);
    if (query.featured !== undefined) countQuery = countQuery.eq('featured', query.featured);
    if (query.search) {
      countQuery = countQuery.or(
        `title.ilike.%${query.search}%,description.ilike.%${query.search}%,author.ilike.%${query.search}%`
      );
    }

    const { count } = await countQuery;

    // Process resources to add computed fields
    const processedResources = resources?.map(resource => ({
      ...resource,
      vote_summary: {
        upvotes: resource.votes_summary?.filter((v: any) => v.vote_type === 'up').length || 0,
        downvotes: resource.votes_summary?.filter((v: any) => v.vote_type === 'down').length || 0,
      },
      user_vote: resource.user_vote?.[0]?.vote_type || null,
    })) || [];

    return NextResponse.json({
      data: processedResources,
      pagination: {
        total: count || 0,
        offset: query.offset,
        limit: query.limit,
        hasMore: (query.offset + query.limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error('Resources GET error:', error);

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

// POST /api/resources - Submit new resource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const resourceData = ResourceSubmissionSchema.parse(body);

    const supabase = createServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if URL already exists
    const { data: existingResource } = await supabase
      .from('resources')
      .select('id')
      .eq('url', resourceData.url)
      .single();

    if (existingResource) {
      return NextResponse.json(
        { error: 'Resource with this URL already exists' },
        { status: 409 }
      );
    }

    // Verify transaction hash if provided (for paid submissions)
    if (resourceData.submission_tx_hash) {
      const isValidTx = await verifySubmissionTransaction(
        resourceData.submission_tx_hash,
        user.id,
        resourceData.submission_amount || 1000
      );

      if (!isValidTx) {
        return NextResponse.json(
          { error: 'Invalid or unverified transaction' },
          { status: 400 }
        );
      }
    }

    // Create resource
    const { data: newResource, error: insertError } = await supabase
      .from('resources')
      .insert({
        ...resourceData,
        submitted_by: user.id,
        submission_amount: resourceData.submission_amount || 1000,
      })
      .select(`
        *,
        submitted_by:users(id, username, display_name, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error creating resource:', insertError);
      return NextResponse.json(
        { error: 'Failed to create resource' },
        { status: 500 }
      );
    }

    // Update user submission count
    await supabase
      .from('users')
      .update({
        total_submissions: supabase.raw('total_submissions + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Track analytics event
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'resource_submitted',
        user_id: user.id,
        resource_id: newResource.id,
        properties: {
          category: resourceData.category,
          has_payment: !!resourceData.submission_tx_hash,
          submission_amount: resourceData.submission_amount || 1000,
        },
      });

    return NextResponse.json({
      data: newResource,
      message: 'Resource submitted successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Resource submission error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid resource data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify submission transaction on blockchain
async function verifySubmissionTransaction(
  txHash: string,
  userId: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    // This would verify the transaction on the blockchain
    // For now, we'll assume it's valid if the hash looks correct

    if (!txHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      return false; // Invalid hash format
    }

    // TODO: Implement actual blockchain verification
    // 1. Connect to RPC endpoint
    // 2. Get transaction receipt
    // 3. Verify transaction was to our contract
    // 4. Verify amount matches expected
    // 5. Verify transaction is confirmed
    // 6. Check that transaction hasn't been used before

    // For development, return true
    return true;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
}

// Helper function to extract content metadata from URL
async function extractContentMetadata(url: string) {
  try {
    // This would extract metadata like title, description, etc. from the URL
    // Could use services like Embedly, or scrape meta tags

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Stumble Higher Bot 1.0',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract basic meta tags
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
    const ogDescriptionMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);

    return {
      title: ogTitleMatch?.[1] || titleMatch?.[1] || '',
      description: ogDescriptionMatch?.[1] || descriptionMatch?.[1] || '',
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return null;
  }
}

// PATCH /api/resources - Update resource (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('id');

    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const supabase = createServerClient();

    // Get current user and check admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Update resource
    const { data: updatedResource, error: updateError } = await supabase
      .from('resources')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resourceId)
      .select(`
        *,
        submitted_by:users(id, username, display_name, avatar_url)
      `)
      .single();

    if (updateError) {
      console.error('Error updating resource:', updateError);
      return NextResponse.json(
        { error: 'Failed to update resource' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action: 'resource_updated',
        target_type: 'resource',
        target_id: resourceId,
        metadata: { changes: body },
      });

    return NextResponse.json({
      data: updatedResource,
      message: 'Resource updated successfully',
    });
  } catch (error) {
    console.error('Resource update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/resources - Delete resource (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('id');

    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get current user and check admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Soft delete by setting status to 'hidden'
    const { error: deleteError } = await supabase
      .from('resources')
      .update({
        status: 'hidden',
        updated_at: new Date().toISOString(),
      })
      .eq('id', resourceId);

    if (deleteError) {
      console.error('Error deleting resource:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete resource' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action: 'resource_deleted',
        target_type: 'resource',
        target_id: resourceId,
        metadata: {},
      });

    return NextResponse.json({
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    console.error('Resource deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

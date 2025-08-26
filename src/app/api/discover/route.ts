import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schemas
const DiscoverQuerySchema = z.object({
  algorithm: z.enum(['personalized', 'popular', 'recent', 'random']).optional().default('personalized'),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  max_time: z.string().transform(Number).pipe(z.number().int().min(1).max(10080)).optional(),
  exclude_viewed: z.string().transform(s => s === 'true').optional().default(true),
  exclude_ids: z.string().optional(), // Comma-separated UUIDs
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(50)).optional().default(10),
  session_id: z.string().optional(),
});

// GET /api/discover - Get personalized content recommendations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = DiscoverQuerySchema.parse(Object.fromEntries(searchParams));

    const supabase = createServerClient();

    // Get current user (optional for discovery)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let resources = [];
    let algorithm_used = query.algorithm;

    // Parse exclude IDs
    const excludeIds = query.exclude_ids
      ? query.exclude_ids.split(',').filter(id => id.match(/^[0-9a-f-]{36}$/i))
      : [];

    if (query.algorithm === 'personalized' && userId) {
      // Get personalized recommendations
      resources = await getPersonalizedRecommendations(
        userId,
        query.limit,
        query.exclude_viewed,
        excludeIds,
        query.category,
        query.difficulty,
        query.max_time
      );

      // Fall back to popular if no personalized results
      if (resources.length === 0) {
        algorithm_used = 'popular';
        resources = await getPopularContent(
          query.limit,
          excludeIds,
          query.category,
          query.difficulty,
          query.max_time
        );
      }
    } else if (query.algorithm === 'popular') {
      resources = await getPopularContent(
        query.limit,
        excludeIds,
        query.category,
        query.difficulty,
        query.max_time
      );
    } else if (query.algorithm === 'recent') {
      resources = await getRecentContent(
        query.limit,
        excludeIds,
        query.category,
        query.difficulty,
        query.max_time
      );
    } else {
      // Random or fallback
      algorithm_used = 'random';
      resources = await getRandomContent(
        query.limit,
        excludeIds,
        query.category,
        query.difficulty,
        query.max_time
      );
    }

    // Track analytics event
    if (userId || query.session_id) {
      await supabase
        .from('analytics_events')
        .insert({
          event_type: 'discovery_request',
          user_id: userId,
          session_id: query.session_id,
          properties: {
            algorithm: algorithm_used,
            category: query.category,
            difficulty: query.difficulty,
            max_time: query.max_time,
            results_count: resources.length,
            exclude_count: excludeIds.length,
          },
        });
    }

    return NextResponse.json({
      data: resources,
      algorithm_used,
      metadata: {
        user_id: userId,
        session_id: query.session_id,
        timestamp: new Date().toISOString(),
        filters_applied: {
          category: query.category,
          difficulty: query.difficulty,
          max_time: query.max_time,
          exclude_viewed: query.exclude_viewed,
        },
      },
    });
  } catch (error) {
    console.error('Discovery error:', error);

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

// POST /api/discover/interaction - Track user interaction with discovered content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const interactionData = z.object({
      resource_id: z.string().uuid(),
      interaction_type: z.enum(['view', 'click_through', 'favorite', 'share', 'skip']),
      session_id: z.string().optional(),
      duration_seconds: z.number().optional(),
      completion_percentage: z.number().min(0).max(100).optional(),
      algorithm_used: z.string().optional(),
      relevance_score: z.number().optional(),
    }).parse(body);

    const supabase = createServerClient();

    // Get current user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Track interaction
    await supabase
      .from('user_interactions')
      .insert({
        user_id: user?.id,
        resource_id: interactionData.resource_id,
        interaction_type: interactionData.interaction_type,
        session_id: interactionData.session_id,
        metadata: {
          duration_seconds: interactionData.duration_seconds,
          completion_percentage: interactionData.completion_percentage,
          algorithm_used: interactionData.algorithm_used,
          relevance_score: interactionData.relevance_score,
        },
      });

    // Update resource view count if it's a view interaction
    if (interactionData.interaction_type === 'view') {
      await supabase
        .from('resources')
        .update({
          views: supabase.raw('views + 1'),
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', interactionData.resource_id);

      // Update unique viewers count if user hasn't viewed before
      if (user?.id) {
        const { data: previousView } = await supabase
          .from('user_interactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('resource_id', interactionData.resource_id)
          .eq('interaction_type', 'view')
          .neq('id', null) // Exclude the one we just inserted
          .single();

        if (!previousView) {
          await supabase
            .from('resources')
            .update({
              unique_viewers: supabase.raw('unique_viewers + 1'),
            })
            .eq('id', interactionData.resource_id);
        }
      }
    }

    // Track analytics event
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'content_interaction',
        user_id: user?.id,
        resource_id: interactionData.resource_id,
        session_id: interactionData.session_id,
        properties: {
          interaction_type: interactionData.interaction_type,
          duration_seconds: interactionData.duration_seconds,
          completion_percentage: interactionData.completion_percentage,
          algorithm_used: interactionData.algorithm_used,
        },
      });

    return NextResponse.json({
      message: 'Interaction tracked successfully',
    });
  } catch (error) {
    console.error('Interaction tracking error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid interaction data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for different discovery algorithms

async function getPersonalizedRecommendations(
  userId: string,
  limit: number,
  excludeViewed: boolean,
  excludeIds: string[],
  category?: string,
  difficulty?: string,
  maxTime?: number
): Promise<any[]> {
  try {
    const supabase = createServerClient();

    // Use the database function for personalized recommendations
    const { data: recommendations } = await supabase
      .rpc('get_personalized_recommendations', {
        target_user_id: userId,
        limit_count: limit * 2, // Get more to filter
        exclude_viewed: excludeViewed,
      });

    if (!recommendations || recommendations.length === 0) {
      return [];
    }

    // Get full resource data
    const resourceIds = recommendations.map(r => r.resource_id);
    let query = supabase
      .from('resources')
      .select(`
        *,
        submitted_by:users(id, username, display_name, avatar_url, reputation_score)
      `)
      .in('id', resourceIds)
      .eq('status', 'approved');

    // Apply additional filters
    if (category) query = query.eq('category', category);
    if (difficulty) query = query.eq('difficulty_level', difficulty);
    if (maxTime) query = query.lte('estimated_time_minutes', maxTime);
    if (excludeIds.length > 0) query = query.not('id', 'in', `(${excludeIds.join(',')})`);

    const { data: resources } = await query;

    if (!resources) return [];

    // Merge with relevance scores and sort
    const resourcesWithScores = resources.map(resource => {
      const recommendation = recommendations.find(r => r.resource_id === resource.id);
      return {
        ...resource,
        relevance_score: recommendation?.relevance_score || 0,
      };
    }).sort((a, b) => b.relevance_score - a.relevance_score);

    return resourcesWithScores.slice(0, limit);
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return [];
  }
}

async function getPopularContent(
  limit: number,
  excludeIds: string[],
  category?: string,
  difficulty?: string,
  maxTime?: number
): Promise<any[]> {
  try {
    const supabase = createServerClient();

    let query = supabase
      .from('resources')
      .select(`
        *,
        submitted_by:users(id, username, display_name, avatar_url, reputation_score)
      `)
      .eq('status', 'approved')
      .order('quality_score', { ascending: false });

    // Apply filters
    if (category) query = query.eq('category', category);
    if (difficulty) query = query.eq('difficulty_level', difficulty);
    if (maxTime) query = query.lte('estimated_time_minutes', maxTime);
    if (excludeIds.length > 0) query = query.not('id', 'in', `(${excludeIds.join(',')})`);

    query = query.limit(limit);

    const { data: resources } = await query;
    return resources || [];
  } catch (error) {
    console.error('Error getting popular content:', error);
    return [];
  }
}

async function getRecentContent(
  limit: number,
  excludeIds: string[],
  category?: string,
  difficulty?: string,
  maxTime?: number
): Promise<any[]> {
  try {
    const supabase = createServerClient();

    let query = supabase
      .from('resources')
      .select(`
        *,
        submitted_by:users(id, username, display_name, avatar_url, reputation_score)
      `)
      .eq('status', 'approved')
      .gte('quality_score', 0) // Only show content with non-negative quality
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) query = query.eq('category', category);
    if (difficulty) query = query.eq('difficulty_level', difficulty);
    if (maxTime) query = query.lte('estimated_time_minutes', maxTime);
    if (excludeIds.length > 0) query = query.not('id', 'in', `(${excludeIds.join(',')})`);

    query = query.limit(limit);

    const { data: resources } = await query;
    return resources || [];
  } catch (error) {
    console.error('Error getting recent content:', error);
    return [];
  }
}

async function getRandomContent(
  limit: number,
  excludeIds: string[],
  category?: string,
  difficulty?: string,
  maxTime?: number
): Promise<any[]> {
  try {
    const supabase = createServerClient();

    // Use the database function for random content
    const { data: randomResults } = await supabase
      .rpc('get_random_stumble_content', {
        limit_count: limit * 3, // Get more to filter
        exclude_ids: excludeIds,
      });

    if (!randomResults || randomResults.length === 0) {
      return [];
    }

    // Get full resource data
    const resourceIds = randomResults.map(r => r.resource_id);
    let query = supabase
      .from('resources')
      .select(`
        *,
        submitted_by:users(id, username, display_name, avatar_url, reputation_score)
      `)
      .in('id', resourceIds);

    // Apply additional filters
    if (category) query = query.eq('category', category);
    if (difficulty) query = query.eq('difficulty_level', difficulty);
    if (maxTime) query = query.lte('estimated_time_minutes', maxTime);

    const { data: resources } = await query;

    if (!resources) return [];

    // Shuffle and limit
    const shuffled = resources.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  } catch (error) {
    console.error('Error getting random content:', error);
    return [];
  }
}

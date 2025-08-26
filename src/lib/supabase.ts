import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

// Ensure environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client
export const createBrowserClient = () =>
  createClientComponentClient<Database>();

// Server-side Supabase client (for API routes and server components)
export const createServerClient = () =>
  createServerComponentClient<Database>({ cookies });

// Service role client (for admin operations)
export const createServiceClient = () => {
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Default client for client-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Utility functions for common operations
export const supabaseUtils = {
  // Get user profile with error handling
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  },

  // Get resources with filters and pagination
  async getResources({
    status = 'approved',
    category,
    tags,
    limit = 10,
    offset = 0,
    orderBy = 'trending_score'
  }: {
    status?: string;
    category?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    orderBy?: 'trending_score' | 'quality_score' | 'created_at' | 'views';
  } = {}) {
    let query = supabase
      .from('resources')
      .select(`
        *,
        submitted_by:users(id, username, display_name, avatar_url),
        vote_summary:votes(vote_type, user_id),
        interaction_count:user_interactions(count)
      `)
      .eq('status', status)
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    query = query.order(orderBy, { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching resources:', error);
      return { data: [], error };
    }

    return { data, error: null };
  },

  // Get personalized recommendations for a user
  async getPersonalizedRecommendations(userId: string, limit = 10) {
    const { data, error } = await supabase
      .rpc('get_personalized_recommendations', {
        target_user_id: userId,
        limit_count: limit
      });

    if (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }

    // Fetch full resource data for recommended IDs
    if (data && data.length > 0) {
      const resourceIds = data.map((item: any) => item.resource_id);
      const { data: resources } = await supabase
        .from('resources')
        .select(`
          *,
          submitted_by:users(id, username, display_name, avatar_url)
        `)
        .in('id', resourceIds);

      // Maintain order from recommendation algorithm
      return data.map((rec: any) => {
        const resource = resources?.find(r => r.id === rec.resource_id);
        return {
          ...resource,
          relevance_score: rec.relevance_score
        };
      }).filter(Boolean);
    }

    return [];
  },

  // Get random stumble content
  async getRandomStumbleContent(excludeIds: string[] = [], limit = 1) {
    const { data, error } = await supabase
      .rpc('get_random_stumble_content', {
        limit_count: limit,
        exclude_ids: excludeIds
      });

    if (error) {
      console.error('Error fetching random content:', error);
      return [];
    }

    if (data && data.length > 0) {
      const resourceIds = data.map((item: any) => item.resource_id);
      const { data: resources } = await supabase
        .from('resources')
        .select(`
          *,
          submitted_by:users(id, username, display_name, avatar_url)
        `)
        .in('id', resourceIds);

      return resources || [];
    }

    return [];
  },

  // Track user interaction
  async trackInteraction({
    userId,
    resourceId,
    interactionType,
    sessionId,
    metadata = {}
  }: {
    userId?: string;
    resourceId: string;
    interactionType: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }) {
    const { error } = await supabase
      .from('user_interactions')
      .insert({
        user_id: userId,
        resource_id: resourceId,
        interaction_type: interactionType,
        session_id: sessionId,
        metadata
      });

    if (error) {
      console.error('Error tracking interaction:', error);
    }

    // Update view count if it's a view interaction
    if (interactionType === 'view') {
      await supabase
        .from('resources')
        .update({
          views: supabase.raw('views + 1'),
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', resourceId);
    }
  },

  // Submit a vote
  async submitVote(userId: string, resourceId: string, voteType: 'up' | 'down') {
    const { error } = await supabase
      .from('votes')
      .upsert({
        user_id: userId,
        resource_id: resourceId,
        vote_type: voteType
      });

    if (error) {
      console.error('Error submitting vote:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  },

  // Get user's vote for a resource
  async getUserVote(userId: string, resourceId: string) {
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('user_id', userId)
      .eq('resource_id', resourceId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user vote:', error);
      return null;
    }

    return data?.vote_type || null;
  },

  // Add to favorites
  async toggleFavorite(userId: string, resourceId: string) {
    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('resource_id', resourceId)
      .single();

    if (existing) {
      // Remove from favorites
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('resource_id', resourceId);

      return { favorited: false, error };
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, resource_id: resourceId });

      return { favorited: true, error };
    }
  },

  // Submit a resource
  async submitResource({
    title,
    author,
    url,
    description,
    category,
    tags,
    difficulty_level,
    estimated_time_minutes,
    submittedBy,
    submissionTxHash,
    submissionAmount
  }: {
    title: string;
    author?: string;
    url: string;
    description?: string;
    category: string;
    tags?: string[];
    difficulty_level?: string;
    estimated_time_minutes?: number;
    submittedBy: string;
    submissionTxHash?: string;
    submissionAmount?: number;
  }) {
    const { data, error } = await supabase
      .from('resources')
      .insert({
        title,
        author,
        url,
        description,
        category,
        tags,
        difficulty_level,
        estimated_time_minutes,
        submitted_by: submittedBy,
        submission_tx_hash: submissionTxHash,
        submission_amount: submissionAmount || 1000
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting resource:', error);
      return { data: null, error };
    }

    return { data, error: null };
  }
};

// Real-time subscriptions utilities
export const subscriptions = {
  // Subscribe to resource updates
  subscribeToResource(resourceId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`resource-${resourceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'resources',
        filter: `id=eq.${resourceId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to vote updates for a resource
  subscribeToResourceVotes(resourceId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`votes-${resourceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `resource_id=eq.${resourceId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to user's interactions
  subscribeToUserInteractions(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`user-interactions-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_interactions',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();
  }
};

export default supabase;

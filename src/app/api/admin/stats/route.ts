import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Check admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

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

    // Get today's date for filtering
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Fetch all stats in parallel
    const [
      totalUsers,
      newUsersToday,
      activeUsersWeekly,
      totalContent,
      newContentToday,
      pendingContent,
      approvedContent,
      rejectedContent,
      totalVotes,
      votesToday,
      totalViews,
      viewsToday,
      totalSubmissionsPaid,
      totalRewardsDistributed,
      currentPool,
    ] = await Promise.all([
      // User stats
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),

      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Content stats
      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),

      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),

      supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected'),

      // Engagement stats
      supabase
        .from('votes')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),

      supabase
        .from('user_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('interaction_type', 'view'),

      supabase
        .from('user_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('interaction_type', 'view')
        .gte('created_at', todayStart.toISOString()),

      // Economic stats
      supabase
        .from('resources')
        .select('submission_amount', { count: 'exact' })
        .not('submission_tx_hash', 'is', null),

      supabase
        .from('reward_distributions')
        .select('amount')
        .not('distributed_at', 'is', null),

      supabase
        .from('weekly_rewards')
        .select('total_pool_amount')
        .is('distribution_completed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    // Calculate totals
    const totalRewards = totalRewardsDistributed.data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;
    const totalSubmissions = totalSubmissionsPaid.count || 0;

    const stats = {
      users: {
        total: totalUsers.count || 0,
        new_today: newUsersToday.count || 0,
        active_weekly: activeUsersWeekly.count || 0,
      },
      content: {
        total: totalContent.count || 0,
        pending: pendingContent.count || 0,
        approved: approvedContent.count || 0,
        rejected: rejectedContent.count || 0,
        new_today: newContentToday.count || 0,
      },
      engagement: {
        total_votes: totalVotes.count || 0,
        total_views: totalViews.count || 0,
        votes_today: votesToday.count || 0,
        views_today: viewsToday.count || 0,
      },
      economics: {
        total_submissions_paid: totalSubmissions,
        total_rewards_distributed: totalRewards,
        current_pool: currentPool.data?.total_pool_amount || 0,
      },
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface Stats {
  users: {
    total: number;
    new_today: number;
    active_weekly: number;
  };
  content: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    new_today: number;
  };
  engagement: {
    total_votes: number;
    total_views: number;
    votes_today: number;
    views_today: number;
  };
  economics: {
    total_submissions_paid: number;
    total_rewards_distributed: number;
    current_pool: number;
  };
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: {
    username: string;
    display_name?: string;
  };
}

export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/admin/activity?limit=10');
      const data = await response.json();

      if (response.ok) {
        setRecentActivity(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching recent activity:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Stats</h3>
        <p className="text-zinc-400 mb-4">{error || 'Unknown error occurred'}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchStats();
            fetchRecentActivity();
          }}
          className="btn btn-default"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.total.toLocaleString(),
      change: `+${stats.users.new_today} today`,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      title: 'Total Content',
      value: stats.content.total.toLocaleString(),
      change: `+${stats.content.new_today} today`,
      icon: FileText,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      title: 'Pending Review',
      value: stats.content.pending.toLocaleString(),
      change: 'needs attention',
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
    {
      title: 'Total Votes',
      value: stats.engagement.total_votes.toLocaleString(),
      change: `+${stats.engagement.votes_today} today`,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      title: 'Total Views',
      value: stats.engagement.total_views.toLocaleString(),
      change: `+${stats.engagement.views_today} today`,
      icon: Activity,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-400/10',
    },
    {
      title: 'Revenue ($HIGHER)',
      value: (stats.economics.total_submissions_paid * 1000).toLocaleString(),
      change: 'from submissions',
      icon: DollarSign,
      color: 'text-brand',
      bgColor: 'bg-brand/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={stat.color} size={24} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                <p className="text-sm text-zinc-400">{stat.title}</p>
                <p className="text-xs text-zinc-500">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Breakdown */}
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <h3 className="text-lg font-semibold text-white mb-4">Content Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={16} />
                <span className="text-zinc-300">Approved</span>
              </div>
              <span className="text-white font-medium">{stats.content.approved.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-yellow-400" size={16} />
                <span className="text-zinc-300">Pending</span>
              </div>
              <span className="text-white font-medium">{stats.content.pending.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-400" size={16} />
                <span className="text-zinc-300">Rejected</span>
              </div>
              <span className="text-white font-medium">{stats.content.rejected.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Economic Overview */}
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <h3 className="text-lg font-semibold text-white mb-4">Economic Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Submissions Revenue</span>
              <span className="text-white font-medium">
                {(stats.economics.total_submissions_paid * 1000).toLocaleString()} $HIGHER
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Rewards Distributed</span>
              <span className="text-white font-medium">
                {stats.economics.total_rewards_distributed.toLocaleString()} $HIGHER
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Current Pool</span>
              <span className="text-white font-medium">
                {stats.economics.current_pool.toLocaleString()} $HIGHER
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-zinc-700 last:border-b-0">
                <div className="w-2 h-2 bg-brand rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.user && (
                      <span className="text-xs text-zinc-400">
                        by {activity.user.display_name || activity.user.username}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-400 text-center py-4">No recent activity</p>
        )}
      </div>
    </div>
  );
}

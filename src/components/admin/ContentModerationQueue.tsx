'use client';

import { useState, useEffect } from 'react';
import { ResourceWithVotes } from '@/types/database';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/providers/ToastProvider';
import { CheckCircle, XCircle, Eye, Clock } from 'lucide-react';

export function ContentModerationQueue() {
  const [resources, setResources] = useState<ResourceWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const { success, error } = useToast();

  useEffect(() => {
    fetchResources();
  }, [filter]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filter === 'pending' ? 'pending' : '',
        limit: '50',
        order_by: 'created_at',
        order_direction: 'desc',
      });

      if (filter !== 'pending') {
        params.delete('status');
      }

      const response = await fetch(`/api/admin/resources?${params}`);
      const data = await response.json();

      if (response.ok) {
        setResources(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch resources');
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
      error('Failed to load content queue');
    } finally {
      setLoading(false);
    }
  };

  const handleModeration = async (resourceId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resourceId,
          action,
          reason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        success(`Content ${action}d successfully`);
        // Remove from list or update status
        setResources(prev =>
          prev.filter(r => r.id !== resourceId)
        );
      } else {
        throw new Error(data.error || `Failed to ${action} content`);
      }
    } catch (err) {
      console.error(`Error ${action}ing content:`, err);
      error(err instanceof Error ? err.message : `Failed to ${action} content`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Content Moderation</h2>
          <p className="text-zinc-400">Review and moderate submitted content</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-zinc-700 rounded-lg p-1">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'pending'
                ? 'bg-brand text-white'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            Pending ({resources.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-brand text-white'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            All Content
          </button>
        </div>
      </div>

      {/* Content List */}
      {resources.length > 0 ? (
        <div className="space-y-4">
          {resources.map((resource) => (
            <div key={resource.id} className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
              <div className="p-4">
                <ResourceCard
                  resource={resource}
                  showDescription={true}
                  showSubmitter={true}
                  compact={false}
                />
              </div>

              {/* Moderation Actions */}
              {resource.status === 'pending' && (
                <div className="bg-zinc-700 px-4 py-3 border-t border-zinc-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>Submitted {new Date(resource.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye size={14} />
                        <span>{resource.views} views</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleModeration(resource.id, 'reject', 'Quality standards not met')}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                      <button
                        onClick={() => handleModeration(resource.id, 'approve')}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {filter === 'pending' ? 'No Pending Content' : 'No Content Found'}
          </h3>
          <p className="text-zinc-400">
            {filter === 'pending'
              ? 'All submitted content has been reviewed!'
              : 'No content matches the current filter.'
            }
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useAnalytics } from '@/providers/AnalyticsProvider';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { StumbleControls } from '@/components/stumble/StumbleControls';
import { ContentViewer } from '@/components/stumble/ContentViewer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResourceWithVotes } from '@/types/database';

interface StumbleState {
  currentResource: ResourceWithVotes | null;
  loading: boolean;
  error: string | null;
  viewedResourceIds: string[];
  algorithm: 'personalized' | 'popular' | 'recent' | 'random';
}

export default function StumblePage() {
  const { user } = useAuth();
  const { track, trackResourceInteraction } = useAnalytics();

  const [state, setState] = useState<StumbleState>({
    currentResource: null,
    loading: true,
    error: null,
    viewedResourceIds: [],
    algorithm: 'personalized',
  });

  const [sessionId] = useState(() =>
    Math.random().toString(36).substring(2, 15)
  );

  // Fetch next resource from discovery API
  const fetchNextResource = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        algorithm: state.algorithm,
        exclude_ids: state.viewedResourceIds.join(','),
        limit: '1',
        session_id: sessionId,
      });

      const response = await fetch(`/api/discover?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch resource');
      }

      if (data.data && data.data.length > 0) {
        const resource = data.data[0];
        setState(prev => ({
          ...prev,
          currentResource: resource,
          loading: false,
          viewedResourceIds: [...prev.viewedResourceIds, resource.id],
        }));

        // Track discovery
        track('stumble', {
          algorithm_used: data.algorithm_used,
          resource_id: resource.id,
          session_id: sessionId,
        });

        // Track view interaction
        await trackResourceView(resource.id);
      } else {
        throw new Error('No more resources available');
      }
    } catch (error) {
      console.error('Error fetching resource:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load content',
      }));
    }
  }, [state.algorithm, state.viewedResourceIds, sessionId, track]);

  // Track resource view
  const trackResourceView = async (resourceId: string) => {
    try {
      await fetch('/api/discover/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resourceId,
          interaction_type: 'view',
          session_id: sessionId,
          algorithm_used: state.algorithm,
        }),
      });

      trackResourceInteraction(resourceId, 'view', {
        algorithm: state.algorithm,
        session_id: sessionId,
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  // Handle stumble to next resource
  const handleStumble = useCallback(() => {
    fetchNextResource();
  }, [fetchNextResource]);

  // Handle algorithm change
  const handleAlgorithmChange = (algorithm: typeof state.algorithm) => {
    setState(prev => ({ ...prev, algorithm }));
    // Reset viewed resources when changing algorithm
    setState(prev => ({ ...prev, viewedResourceIds: [] }));
    fetchNextResource();
  };

  // Handle resource interaction
  const handleResourceInteraction = async (
    interactionType: string,
    properties?: Record<string, any>
  ) => {
    if (!state.currentResource) return;

    try {
      await fetch('/api/discover/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: state.currentResource.id,
          interaction_type: interactionType,
          session_id: sessionId,
          algorithm_used: state.algorithm,
          ...properties,
        }),
      });

      trackResourceInteraction(state.currentResource.id, interactionType, {
        algorithm: state.algorithm,
        session_id: sessionId,
        ...properties,
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  // Handle vote
  const handleVote = async (voteType: 'up' | 'down') => {
    if (!state.currentResource || !user) return;

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: state.currentResource.id,
          vote_type: voteType,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update local state with new vote
        setState(prev => ({
          ...prev,
          currentResource: prev.currentResource ? {
            ...prev.currentResource,
            user_vote: result.data.vote_type,
          } : null,
        }));

        await handleResourceInteraction('vote', { vote_type: voteType });
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  // Handle favorite toggle
  const handleFavorite = async () => {
    if (!state.currentResource || !user) return;

    try {
      const response = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: state.currentResource.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update local state
        setState(prev => ({
          ...prev,
          currentResource: prev.currentResource ? {
            ...prev.currentResource,
            is_favorited: result.favorited,
          } : null,
        }));

        await handleResourceInteraction('favorite', {
          action: result.favorited ? 'add' : 'remove'
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Handle external link click
  const handleExternalClick = () => {
    if (!state.currentResource) return;

    handleResourceInteraction('click_through', {
      target_url: state.currentResource.url,
    });

    window.open(state.currentResource.url, '_blank');
  };

  // Load initial resource
  useEffect(() => {
    fetchNextResource();
  }, []);

  // Track session start
  useEffect(() => {
    track('stumble_session_start', {
      session_id: sessionId,
      algorithm: state.algorithm,
      is_authenticated: !!user,
    });

    return () => {
      track('stumble_session_end', {
        session_id: sessionId,
        resources_viewed: state.viewedResourceIds.length,
      });
    };
  }, []);

  if (state.loading && !state.currentResource) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (state.error && !state.currentResource) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center text-white">
        <div className="text-red-400 mb-4">⚠️ {state.error}</div>
        <button
          onClick={() => fetchNextResource()}
          className="btn-brand"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      {/* Content Viewer */}
      <div className="flex-1">
        {state.currentResource ? (
          <ContentViewer
            resource={state.currentResource}
            onExternalClick={handleExternalClick}
            loading={state.loading}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-zinc-400">No content available</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <StumbleControls
        resource={state.currentResource}
        onStumble={handleStumble}
        onVote={handleVote}
        onFavorite={handleFavorite}
        onExternalClick={handleExternalClick}
        onAlgorithmChange={handleAlgorithmChange}
        currentAlgorithm={state.algorithm}
        loading={state.loading}
        isAuthenticated={!!user}
      />
    </div>
  );
}

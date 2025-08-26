'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { createBrowserClient } from '@/lib/supabase';

interface AnalyticsEvent {
  event_type: string;
  properties?: Record<string, any>;
  user_id?: string;
  session_id?: string;
  resource_id?: string;
}

interface AnalyticsContextType {
  // Core tracking methods
  track: (eventType: string, properties?: Record<string, any>) => void;
  trackPageView: (page: string, properties?: Record<string, any>) => void;
  trackUserAction: (action: string, properties?: Record<string, any>) => void;
  trackResourceInteraction: (resourceId: string, interactionType: string, properties?: Record<string, any>) => void;

  // Session management
  sessionId: string;

  // User identification
  identify: (userId: string, traits?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

// Generate unique session ID
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Get or create session ID from storage
function getSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();

  let sessionId = sessionStorage.getItem('stumble_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('stumble_session_id', sessionId);
  }
  return sessionId;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const sessionId = useRef(getSessionId());
  const supabase = createBrowserClient();

  // Queue for batching events when offline
  const eventQueue = useRef<AnalyticsEvent[]>([]);
  const isOnline = useRef(true);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true;
      flushEventQueue();
    };

    const handleOffline = () => {
      isOnline.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Flush queued events when coming back online
  const flushEventQueue = async () => {
    if (eventQueue.current.length === 0) return;

    const events = [...eventQueue.current];
    eventQueue.current = [];

    try {
      await supabase
        .from('analytics_events')
        .insert(events);
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-queue events if failed
      eventQueue.current.unshift(...events);
    }
  };

  // Core tracking function
  const track = async (eventType: string, properties: Record<string, any> = {}) => {
    const event: AnalyticsEvent = {
      event_type: eventType,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        page_title: document.title,
        referrer: document.referrer,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      },
      user_id: user?.id,
      session_id: sessionId.current,
      resource_id: properties.resource_id,
    };

    if (isOnline.current) {
      try {
        await supabase
          .from('analytics_events')
          .insert([event]);
      } catch (error) {
        console.error('Analytics tracking error:', error);
        // Queue for later if failed
        eventQueue.current.push(event);
      }
    } else {
      // Queue event for when we're back online
      eventQueue.current.push(event);
    }

    // Also send to external analytics if configured
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventType, {
        event_category: properties.category || 'engagement',
        event_label: properties.label,
        value: properties.value,
        custom_map: properties,
      });
    }
  };

  // Track page views
  const trackPageView = (page: string, properties: Record<string, any> = {}) => {
    track('page_view', {
      page,
      ...properties,
    });
  };

  // Track user actions
  const trackUserAction = (action: string, properties: Record<string, any> = {}) => {
    track('user_action', {
      action,
      ...properties,
    });
  };

  // Track resource interactions
  const trackResourceInteraction = (
    resourceId: string,
    interactionType: string,
    properties: Record<string, any> = {}
  ) => {
    track('resource_interaction', {
      resource_id: resourceId,
      interaction_type: interactionType,
      ...properties,
    });
  };

  // Identify user (called when user logs in)
  const identify = (userId: string, traits: Record<string, any> = {}) => {
    track('user_identified', {
      user_id: userId,
      traits,
    });
  };

  // Track session start
  useEffect(() => {
    track('session_start', {
      is_returning_user: !!user,
    });

    // Track session end on page unload
    const handleBeforeUnload = () => {
      track('session_end', {
        session_duration: Date.now() - parseInt(sessionId.current.split('-')[0]),
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Track route changes (for SPAs)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleRouteChange = () => {
        trackPageView(window.location.pathname);
      };

      // Listen for popstate (back/forward navigation)
      window.addEventListener('popstate', handleRouteChange);

      // Track initial page view
      trackPageView(window.location.pathname);

      return () => window.removeEventListener('popstate', handleRouteChange);
    }
  }, []);

  // Track user login/logout
  useEffect(() => {
    if (user) {
      identify(user.id, {
        username: user.username,
        reputation_score: user.reputation_score,
        total_submissions: user.total_submissions,
        created_at: user.created_at,
      });

      track('user_login', {
        user_id: user.id,
        login_method: user.farcaster_id ? 'farcaster' : user.eth_address ? 'wallet' : 'email',
      });
    }
  }, [user]);

  const value: AnalyticsContextType = {
    track,
    trackPageView,
    trackUserAction,
    trackResourceInteraction,
    sessionId: sessionId.current,
    identify,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

// Convenience hooks for common tracking patterns
export function usePageTracking() {
  const { trackPageView } = useAnalytics();

  return {
    trackPageView,
  };
}

export function useResourceTracking() {
  const { trackResourceInteraction, track } = useAnalytics();

  const trackView = (resourceId: string, properties?: Record<string, any>) => {
    trackResourceInteraction(resourceId, 'view', properties);
  };

  const trackClickThrough = (resourceId: string, url: string) => {
    trackResourceInteraction(resourceId, 'click_through', { target_url: url });
  };

  const trackVote = (resourceId: string, voteType: 'up' | 'down') => {
    trackResourceInteraction(resourceId, 'vote', { vote_type: voteType });
  };

  const trackFavorite = (resourceId: string, isFavorited: boolean) => {
    trackResourceInteraction(resourceId, 'favorite', {
      action: isFavorited ? 'add' : 'remove'
    });
  };

  const trackShare = (resourceId: string, shareMethod: string) => {
    trackResourceInteraction(resourceId, 'share', { share_method: shareMethod });
  };

  const trackSubmission = (resourceId: string, properties?: Record<string, any>) => {
    track('resource_submitted', {
      resource_id: resourceId,
      ...properties,
    });
  };

  return {
    trackView,
    trackClickThrough,
    trackVote,
    trackFavorite,
    trackShare,
    trackSubmission,
  };
}

export function useUserActionTracking() {
  const { trackUserAction } = useAnalytics();

  const trackSignUp = (method: string) => {
    trackUserAction('sign_up', { method });
  };

  const trackSignIn = (method: string) => {
    trackUserAction('sign_in', { method });
  };

  const trackSignOut = () => {
    trackUserAction('sign_out');
  };

  const trackProfileUpdate = (fields: string[]) => {
    trackUserAction('profile_update', { updated_fields: fields });
  };

  const trackPreferencesUpdate = () => {
    trackUserAction('preferences_update');
  };

  const trackSearch = (query: string, results: number) => {
    trackUserAction('search', { query, results_count: results });
  };

  const trackFilter = (filterType: string, filterValue: string) => {
    trackUserAction('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue
    });
  };

  return {
    trackSignUp,
    trackSignIn,
    trackSignOut,
    trackProfileUpdate,
    trackPreferencesUpdate,
    trackSearch,
    trackFilter,
  };
}

export function useStumbleTracking() {
  const { track } = useAnalytics();

  const trackStumble = (algorithm: string, resourceId?: string) => {
    track('stumble', {
      algorithm_used: algorithm,
      resource_id: resourceId,
    });
  };

  const trackStumbleSkip = (resourceId: string, reason?: string) => {
    track('stumble_skip', {
      resource_id: resourceId,
      skip_reason: reason,
    });
  };

  const trackDiscoveryRequest = (filters: Record<string, any>) => {
    track('discovery_request', filters);
  };

  return {
    trackStumble,
    trackStumbleSkip,
    trackDiscoveryRequest,
  };
}

// Declare global gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

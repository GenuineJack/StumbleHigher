'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { User, AuthState } from '@/types/database';
import { authService } from '@/lib/auth';

interface AuthContextType extends AuthState {
  signIn: (provider: 'farcaster' | 'wallet' | 'email', data?: any) => Promise<{ error: Error | null; user?: User }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: Error | null; user?: User }>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const session = await authService.getSession();
        const user = session ? await authService.getCurrentUser() : null;

        if (mounted) {
          setAuthState({
            user,
            session,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Authentication error',
          });
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (session) => {
      if (!mounted) return;

      try {
        const user = session ? await authService.getCurrentUser() : null;
        setAuthState({
          user,
          session,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Auth state change error:', error);
        setAuthState({
          user: null,
          session,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error',
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (provider: 'farcaster' | 'wallet' | 'email', data?: any) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let result;

      switch (provider) {
        case 'farcaster':
          result = await authService.signInWithFarcaster(data);
          break;
        case 'wallet':
          result = await authService.signInWithWallet(data);
          break;
        case 'email':
          result = await authService.signInWithEmail(data.email, data.password);
          break;
        default:
          throw new Error('Unsupported authentication provider');
      }

      if (result.error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: result.error!.message,
        }));
        return { error: result.error };
      }

      // Auth state will be updated by the auth state change listener
      return { error: null, user: result.user };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { error: new Error(errorMessage) };
    }
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { error } = await authService.signOut();
      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
      // Auth state will be updated by the auth state change listener
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!authState.user) {
      return { error: new Error('No user logged in') };
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await authService.updateProfile(authState.user.id, updates);

      if (result.error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: result.error!.message,
        }));
        return { error: result.error };
      }

      setAuthState(prev => ({
        ...prev,
        user: result.user!,
        loading: false,
        error: null,
      }));

      return { error: null, user: result.user };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { error: new Error(errorMessage) };
    }
  };

  const refreshUser = async () => {
    if (!authState.session) return;

    try {
      const user = await authService.getCurrentUser();
      setAuthState(prev => ({
        ...prev,
        user,
        error: null,
      }));
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    ...authState,
    signIn,
    signOut,
    updateProfile,
    refreshUser,
    isAuthenticated: !!authState.user && !!authState.session,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convenience hooks
export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useSession() {
  const { session } = useAuth();
  return session;
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

import { createBrowserClient, createServerClient, supabaseUtils } from './supabase';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { SiweMessage } from 'siwe';
import { User as AppUser, AuthUser } from '@/types/database';

// Authentication providers
export type AuthProvider = 'farcaster' | 'wallet' | 'email' | 'google';

// Authentication state
export interface AuthState {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

// Farcaster authentication types
export interface FarcasterProfile {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  bio?: string;
  verifications: string[];
}

export interface FarcasterAuthData {
  fid: number;
  username: string;
  bio: string;
  displayName: string;
  pfpUrl: string;
  verifications: string[];
  signature: string;
  message: string;
  nonce: string;
}

// SIWE authentication data
export interface SiweAuthData {
  message: string;
  signature: string;
  address: string;
  chainId: number;
}

// Main authentication class
export class AuthService {
  private supabase = createBrowserClient();

  // Get current session
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  // Get current user profile
  async getCurrentUser(): Promise<AppUser | null> {
    const session = await this.getSession();
    if (!session?.user) return null;

    const profile = await supabaseUtils.getUserProfile(session.user.id);
    return profile;
  }

  // Sign in with email
  async signInWithEmail(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  }

  // Sign up with email
  async signUpWithEmail(
    email: string,
    password: string,
    metadata: { username: string; display_name?: string }
  ): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    return { error };
  }

  // Sign in with OAuth provider
  async signInWithOAuth(provider: 'google' | 'github' | 'discord'): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { error };
  }

  // Sign in with Farcaster
  async signInWithFarcaster(authData: FarcasterAuthData): Promise<{ error: Error | null; user?: AppUser }> {
    try {
      // Verify Farcaster signature (this would typically be done on the server)
      const isValidSignature = await this.verifyFarcasterSignature(authData);
      if (!isValidSignature) {
        return { error: new Error('Invalid Farcaster signature') };
      }

      // Check if user exists with this Farcaster ID
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('farcaster_id', authData.fid.toString())
        .single();

      if (existingUser) {
        // Sign in existing user
        const { error } = await this.supabase.auth.signInAnonymously();
        if (error) return { error };

        // Update user's auth metadata
        await this.supabase.auth.updateUser({
          data: {
            farcaster_id: authData.fid.toString(),
            username: authData.username,
          }
        });

        return { error: null, user: existingUser };
      } else {
        // Create new user
        const { error: authError } = await this.supabase.auth.signInAnonymously();
        if (authError) return { error: authError };

        const session = await this.getSession();
        if (!session?.user) return { error: new Error('Failed to create session') };

        // Create user profile
        const { data: newUser, error: profileError } = await this.supabase
          .from('users')
          .insert({
            id: session.user.id,
            farcaster_id: authData.fid.toString(),
            farcaster_username: authData.username,
            username: authData.username,
            display_name: authData.displayName,
            avatar_url: authData.pfpUrl,
            bio: authData.bio,
            eth_address: authData.verifications[0] || null, // First verification is usually ETH address
          })
          .select()
          .single();

        if (profileError) return { error: profileError };

        return { error: null, user: newUser };
      }
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Sign in with Ethereum wallet using SIWE
  async signInWithWallet(authData: SiweAuthData): Promise<{ error: Error | null; user?: AppUser }> {
    try {
      // Verify SIWE message
      const siweMessage = new SiweMessage(authData.message);
      const verificationResult = await siweMessage.verify({
        signature: authData.signature,
      });

      if (!verificationResult.success) {
        return { error: new Error('Invalid wallet signature') };
      }

      // Check if user exists with this address
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('eth_address', authData.address.toLowerCase())
        .single();

      if (existingUser) {
        // Sign in existing user
        const { error } = await this.supabase.auth.signInAnonymously();
        if (error) return { error };

        await this.supabase.auth.updateUser({
          data: {
            eth_address: authData.address.toLowerCase(),
          }
        });

        return { error: null, user: existingUser };
      } else {
        // Create new user
        const { error: authError } = await this.supabase.auth.signInAnonymously();
        if (authError) return { error: authError };

        const session = await this.getSession();
        if (!session?.user) return { error: new Error('Failed to create session') };

        // Generate username from address
        const username = `user_${authData.address.slice(0, 8)}`;

        const { data: newUser, error: profileError } = await this.supabase
          .from('users')
          .insert({
            id: session.user.id,
            eth_address: authData.address.toLowerCase(),
            username,
            display_name: `User ${authData.address.slice(0, 8)}`,
          })
          .select()
          .single();

        if (profileError) return { error: profileError };

        return { error: null, user: newUser };
      }
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Link additional authentication method to existing account
  async linkAccount(
    userId: string,
    provider: AuthProvider,
    authData: FarcasterAuthData | SiweAuthData
  ): Promise<{ error: Error | null }> {
    try {
      const updates: Partial<AppUser> = {};

      if (provider === 'farcaster' && 'fid' in authData) {
        const isValid = await this.verifyFarcasterSignature(authData);
        if (!isValid) return { error: new Error('Invalid Farcaster signature') };

        updates.farcaster_id = authData.fid.toString();
        updates.farcaster_username = authData.username;
        if (!updates.avatar_url) updates.avatar_url = authData.pfpUrl;
        if (!updates.bio) updates.bio = authData.bio;
      } else if (provider === 'wallet' && 'address' in authData) {
        const siweMessage = new SiweMessage(authData.message);
        const verificationResult = await siweMessage.verify({
          signature: authData.signature,
        });

        if (!verificationResult.success) {
          return { error: new Error('Invalid wallet signature') };
        }

        updates.eth_address = authData.address.toLowerCase();
      }

      const { error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Update user profile
  async updateProfile(
    userId: string,
    updates: Partial<Pick<AppUser, 'username' | 'display_name' | 'bio' | 'avatar_url'>>
  ): Promise<{ error: Error | null; user?: AppUser }> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) return { error };

      return { error: null, user: data };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  // Check if username is available
  async isUsernameAvailable(username: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    return !data;
  }

  // Get user preferences
  async getUserPreferences(userId: string) {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No preferences found, create defaults
      const defaultPreferences = {
        user_id: userId,
        preferred_categories: [],
        excluded_categories: [],
        preferred_difficulty: 'intermediate',
        max_time_minutes: 60,
        hide_videos: false,
        hide_long_content: false,
        notification_settings: { email: true, push: false },
        discovery_algorithm: 'balanced'
      };

      const { data: newPrefs, error: createError } = await this.supabase
        .from('user_preferences')
        .insert(defaultPreferences)
        .select()
        .single();

      return { data: newPrefs, error: createError };
    }

    return { data, error };
  }

  // Update user preferences
  async updateUserPreferences(userId: string, preferences: any) {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
      })
      .select()
      .single();

    return { data, error };
  }

  // Verify Farcaster signature (simplified - would be more robust in production)
  private async verifyFarcasterSignature(authData: FarcasterAuthData): Promise<boolean> {
    // This would typically involve:
    // 1. Reconstructing the original message
    // 2. Verifying the signature against the user's custody address
    // 3. Checking the nonce to prevent replay attacks
    // For now, we'll assume it's valid if all required fields are present
    return !!(
      authData.fid &&
      authData.username &&
      authData.signature &&
      authData.message &&
      authData.nonce
    );
  }

  // Subscribe to auth changes
  onAuthStateChange(callback: (session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }
}

// Export singleton instance
export const authService = new AuthService();

// Utility functions
export const generateSiweMessage = (
  address: string,
  domain: string,
  uri: string,
  chainId: number,
  nonce: string
): string => {
  const message = new SiweMessage({
    domain,
    address,
    statement: 'Sign in to Stumble Higher',
    uri,
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
  });

  return message.prepareMessage();
};

export const generateNonce = (): string => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};

// Auth context helpers
export const createAuthContext = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

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
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    initAuth();

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
        setAuthState({
          user: null,
          session,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return authState;
};

// React hooks (these would be in a separate hooks file in a real app)
import { useState, useEffect } from 'react';

export const useAuth = () => {
  return createAuthContext();
};

export const useUser = () => {
  const auth = useAuth();
  return auth.user;
};

export const useSession = () => {
  const auth = useAuth();
  return auth.session;
};

export default authService;

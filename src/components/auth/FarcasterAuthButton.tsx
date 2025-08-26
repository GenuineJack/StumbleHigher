'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface FarcasterAuthButtonProps {
  mode: 'signin' | 'signup';
  onSuccess: () => void;
}

export function FarcasterAuthButton({ mode, onSuccess }: FarcasterAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { error } = useToast();

  const handleFarcasterAuth = async () => {
    setIsLoading(true);

    try {
      // Check if Farcaster Frame SDK is available
      if (typeof window === 'undefined' || !window.frame?.sdk) {
        throw new Error('Farcaster authentication is only available in Farcaster apps');
      }

      // Generate a SIWE message for Farcaster
      const domain = window.location.host;
      const uri = window.location.origin;
      const nonce = Math.random().toString(36).substring(2, 15);

      const message = `${domain} wants you to sign in with your Ethereum account:\n\nI am signing in to Stumble Higher\n\nURI: ${uri}\nVersion: 1\nChain ID: 8453\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;

      // Request signature from Farcaster
      const result = await window.frame.sdk.actions.signMessage({
        message,
      });

      if (!result || !result.signature) {
        throw new Error('Signature request failed or was cancelled');
      }

      // Get user profile from Farcaster
      const userProfile = await window.frame.sdk.context.user;

      if (!userProfile) {
        throw new Error('Could not get user profile from Farcaster');
      }

      // Prepare auth data
      const authData = {
        fid: userProfile.fid,
        username: userProfile.username,
        displayName: userProfile.displayName,
        pfpUrl: userProfile.pfpUrl,
        bio: userProfile.bio || '',
        verifications: userProfile.verifications || [],
        signature: result.signature,
        message,
        nonce,
      };

      // Sign in with our backend
      const authResult = await signIn('farcaster', authData);

      if (authResult.error) {
        throw authResult.error;
      }

      onSuccess();
    } catch (err) {
      console.error('Farcaster auth error:', err);
      error(
        err instanceof Error
          ? err.message
          : 'Failed to authenticate with Farcaster'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleFarcasterAuth}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
    >
      {isLoading ? (
        <LoadingSpinner size="sm" color="white" />
      ) : (
        <div className="w-5 h-5 text-xl">🎭</div>
      )}
      <span>
        {isLoading
          ? 'Connecting...'
          : `${mode === 'signin' ? 'Sign in' : 'Sign up'} with Farcaster`
        }
      </span>
    </button>
  );
}

// Extend window type for Farcaster SDK
declare global {
  interface Window {
    frame?: {
      sdk?: {
        actions?: {
          signMessage: (params: { message: string }) => Promise<{ signature: string }>;
          ready: () => void;
        };
        context?: {
          user?: {
            fid: number;
            username: string;
            displayName: string;
            pfpUrl: string;
            bio?: string;
            verifications?: string[];
          };
        };
      };
    };
  }
}

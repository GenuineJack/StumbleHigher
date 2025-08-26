'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { generateSiweMessage, generateNonce } from '@/lib/auth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface WalletAuthButtonProps {
  mode: 'signin' | 'signup';
  onSuccess: () => void;
}

export function WalletAuthButton({ mode, onSuccess }: WalletAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { error } = useToast();

  const handleWalletAuth = async () => {
    setIsLoading(true);

    try {
      // Check if wallet is available
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please install a Web3 wallet like MetaMask to continue');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts found');
      }

      const address = accounts[0];

      // Get chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      // Generate nonce from backend
      const nonceResponse = await fetch('/api/auth/wallet');
      if (!nonceResponse.ok) {
        throw new Error('Failed to generate authentication nonce');
      }
      const { nonce } = await nonceResponse.json();

      // Create SIWE message
      const message = generateSiweMessage(
        address,
        window.location.host,
        window.location.origin,
        parseInt(chainId, 16),
        nonce
      );

      // Request signature
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      // Prepare auth data
      const authData = {
        message,
        signature,
        address,
        chainId: parseInt(chainId, 16),
      };

      // Sign in with our backend
      const authResult = await signIn('wallet', authData);

      if (authResult.error) {
        throw authResult.error;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Wallet auth error:', err);

      // Handle specific wallet errors
      if (err.code === 4001) {
        error('Wallet connection was rejected');
      } else if (err.code === -32002) {
        error('Wallet connection request is already pending');
      } else {
        error(
          err instanceof Error
            ? err.message
            : 'Failed to authenticate with wallet'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleWalletAuth}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
    >
      {isLoading ? (
        <LoadingSpinner size="sm" color="white" />
      ) : (
        <div className="w-5 h-5 text-xl">🦊</div>
      )}
      <span>
        {isLoading
          ? 'Connecting...'
          : `${mode === 'signin' ? 'Sign in' : 'Sign up'} with Wallet`
        }
      </span>
    </button>
  );
}

// Extend window type for Ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { FarcasterAuthButton } from './FarcasterAuthButton';
import { WalletAuthButton } from './WalletAuthButton';
import { EmailAuthForm } from './EmailAuthForm';
import { useToast } from '@/providers/ToastProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'signin' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(defaultTab);
  const [authMethod, setAuthMethod] = useState<'social' | 'email'>('social');
  const { success } = useToast();

  const handleAuthSuccess = () => {
    success('Welcome to Stumble Higher!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-700 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('signin')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'signin'
                ? 'bg-brand text-white'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'signup'
                ? 'bg-brand text-white'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Auth Method Switcher */}
        <div className="flex bg-zinc-700 rounded-lg p-1 mb-6">
          <button
            onClick={() => setAuthMethod('social')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              authMethod === 'social'
                ? 'bg-zinc-600 text-white'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            Social / Web3
          </button>
          <button
            onClick={() => setAuthMethod('email')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              authMethod === 'email'
                ? 'bg-zinc-600 text-white'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            Email
          </button>
        </div>

        {/* Auth Content */}
        <div className="space-y-4">
          {authMethod === 'social' ? (
            <>
              {/* Farcaster Auth */}
              <FarcasterAuthButton
                mode={activeTab}
                onSuccess={handleAuthSuccess}
              />

              {/* Wallet Auth */}
              <WalletAuthButton
                mode={activeTab}
                onSuccess={handleAuthSuccess}
              />

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-800 text-zinc-400">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Switch to Email */}
              <button
                onClick={() => setAuthMethod('email')}
                className="w-full py-3 px-4 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Use Email Instead
              </button>
            </>
          ) : (
            <>
              {/* Email Auth Form */}
              <EmailAuthForm
                mode={activeTab}
                onSuccess={handleAuthSuccess}
              />

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-800 text-zinc-400">
                    or use social login
                  </span>
                </div>
              </div>

              {/* Switch to Social */}
              <button
                onClick={() => setAuthMethod('social')}
                className="w-full py-3 px-4 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Use Social / Web3 Instead
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-zinc-400 text-center">
          {activeTab === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setActiveTab('signup')}
                className="text-brand hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setActiveTab('signin')}
                className="text-brand hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-xs text-zinc-500 text-center leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-brand hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-brand hover:underline">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}

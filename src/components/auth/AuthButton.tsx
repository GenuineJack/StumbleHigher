'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { AuthModal } from './AuthModal';
import { User, LogOut } from 'lucide-react';

export function AuthButton() {
  const { user, isAuthenticated, signOut, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-zinc-700 animate-pulse" />
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name || user.username}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm">
              {(user.display_name || user.username)[0].toUpperCase()}
            </div>
          )}
          <span className="hidden sm:block text-sm text-white">
            {user.display_name || user.username}
          </span>
        </button>

        {/* User Menu */}
        {showUserMenu && (
          <>
            <div className="absolute top-full right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl min-w-[200px] z-50">
              <div className="p-4 border-b border-zinc-700">
                <div className="text-sm font-medium text-white">
                  {user.display_name || user.username}
                </div>
                {user.display_name && (
                  <div className="text-xs text-zinc-400">@{user.username}</div>
                )}
                <div className="text-xs text-zinc-500 mt-1">
                  {user.reputation_score} reputation
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    // Navigate to profile
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded flex items-center gap-2"
                >
                  <User size={16} />
                  Profile
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-medium rounded-lg transition-colors"
      >
        Sign In
      </button>

      {showModal && (
        <AuthModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { Home, ExternalLink, Heart, Share2, Settings, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { ResourceWithVotes } from '@/types/database';
import { VoteButtons } from '@/components/resources/VoteButtons';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface StumbleControlsProps {
  resource: ResourceWithVotes | null;
  onStumble: () => void;
  onVote: (voteType: 'up' | 'down') => void;
  onFavorite: () => void;
  onExternalClick: () => void;
  onAlgorithmChange: (algorithm: 'personalized' | 'popular' | 'recent' | 'random') => void;
  currentAlgorithm: 'personalized' | 'popular' | 'recent' | 'random';
  loading: boolean;
  isAuthenticated: boolean;
}

export function StumbleControls({
  resource,
  onStumble,
  onVote,
  onFavorite,
  onExternalClick,
  onAlgorithmChange,
  currentAlgorithm,
  loading,
  isAuthenticated,
}: StumbleControlsProps) {
  const [showAlgorithmMenu, setShowAlgorithmMenu] = useState(false);

  const algorithmLabels = {
    personalized: '🎯 For You',
    popular: '🔥 Popular',
    recent: '🆕 Recent',
    random: '🎲 Random',
  };

  const handleShare = async () => {
    if (!resource) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: resource.title,
          text: resource.description || '',
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing or error occurred
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(
        `Check out "${resource.title}" on Stumble Higher: ${window.location.href}`
      );
      // You might want to show a toast here
    }
  };

  return (
    <div className="bg-zinc-950/80 backdrop-blur-sm border-t border-zinc-800">
      {/* Resource Info */}
      {resource && (
        <div className="p-4 border-b border-zinc-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-semibold text-sm text-white truncate mb-1">
              #{resource.id?.slice(-8)} — {resource.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {resource.author && <span>by {resource.author}</span>}
              {resource.author && resource.category && <span>•</span>}
              <span className="capitalize">{resource.category}</span>
              {resource.views > 0 && (
                <>
                  <span>•</span>
                  <span>{resource.views} views</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Home Button */}
            <Link
              href="/"
              className="btn-brand-sm flex items-center justify-center"
              title="Home"
            >
              <Home size={16} />
            </Link>

            {/* External Link Button */}
            <button
              onClick={onExternalClick}
              disabled={!resource}
              className="btn-brand-sm flex items-center justify-center"
              title="Open in new tab"
            >
              <ExternalLink size={16} />
            </button>

            {/* Stumble Button */}
            <button
              onClick={onStumble}
              disabled={loading}
              className="flex-1 bg-brand hover:bg-brand-dark text-white font-bold py-3 px-6 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-brand/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Loading...</span>
                </>
              ) : (
                'STUMBLE HIGHER'
              )}
            </button>

            {/* Vote Buttons */}
            {resource && isAuthenticated && (
              <VoteButtons
                upvotes={resource.upvotes}
                downvotes={resource.downvotes}
                userVote={resource.user_vote}
                onVote={onVote}
                size="md"
                showCounts={false}
                orientation="horizontal"
              />
            )}

            {/* Favorite Button */}
            {resource && isAuthenticated && (
              <button
                onClick={onFavorite}
                className={`btn-brand-sm flex items-center justify-center ${
                  resource.is_favorited ? 'text-red-400' : 'text-white'
                }`}
                title={resource.is_favorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={16} fill={resource.is_favorited ? 'currentColor' : 'none'} />
              </button>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              disabled={!resource}
              className="btn-brand-sm flex items-center justify-center"
              title="Share"
            >
              <Share2 size={16} />
            </button>

            {/* Algorithm Menu */}
            <div className="relative">
              <button
                onClick={() => setShowAlgorithmMenu(!showAlgorithmMenu)}
                className="btn-brand-sm flex items-center justify-center"
                title="Change algorithm"
              >
                <Settings size={16} />
              </button>

              {showAlgorithmMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl min-w-[160px] z-50">
                  <div className="p-2">
                    <div className="text-xs text-zinc-400 mb-2 px-2">Discovery Mode</div>
                    {Object.entries(algorithmLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          onAlgorithmChange(key as any);
                          setShowAlgorithmMenu(false);
                        }}
                        className={`w-full text-left px-2 py-2 text-sm rounded transition-colors ${
                          currentAlgorithm === key
                            ? 'bg-brand text-white'
                            : 'text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Algorithm Indicator */}
          <div className="mt-3 text-center">
            <span className="text-xs text-zinc-500">
              {algorithmLabels[currentAlgorithm]}
              {!isAuthenticated && currentAlgorithm === 'personalized' && (
                <span className="ml-1">(Sign in for personalized recommendations)</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Click overlay to close algorithm menu */}
      {showAlgorithmMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAlgorithmMenu(false)}
        />
      )}
    </div>
  );
}

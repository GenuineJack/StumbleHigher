'use client';

import { useState } from 'react';
import { ResourceWithVotes } from '@/types/database';
import { CategoryBadge } from './CategoryBadge';
import { DifficultyIndicator } from './DifficultyIndicator';
import { VoteButtons } from './VoteButtons';
import { formatDistanceToNow } from 'date-fns';

interface ResourceCardProps {
  resource: ResourceWithVotes;
  onVote?: (voteType: 'up' | 'down') => void;
  onFavorite?: () => void;
  onExternalClick?: () => void;
  showDescription?: boolean;
  showSubmitter?: boolean;
  compact?: boolean;
  className?: string;
}

export function ResourceCard({
  resource,
  onVote,
  onFavorite,
  onExternalClick,
  showDescription = true,
  showSubmitter = true,
  compact = false,
  className = '',
}: ResourceCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatTimeEstimate = (minutes?: number) => {
    if (!minutes) return null;

    if (minutes < 60) {
      return `${minutes}m read`;
    } else {
      const hours = Math.round(minutes / 60);
      return `${hours}h read`;
    }
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const generateFavicon = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  return (
    <div className={`resource-card ${compact ? 'p-4' : 'p-6'} ${className}`}>
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {/* Favicon */}
              {!imageError && (
                <img
                  src={generateFavicon(resource.url) || ''}
                  alt=""
                  className="w-4 h-4 rounded-sm"
                  onError={() => setImageError(true)}
                />
              )}

              {/* Hostname */}
              <span className="text-xs text-zinc-400">
                {getHostname(resource.url)}
              </span>

              {/* Time estimate */}
              {resource.estimated_time_minutes && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs text-zinc-400">
                    {formatTimeEstimate(resource.estimated_time_minutes)}
                  </span>
                </>
              )}
            </div>

            {/* Title */}
            <h3 className={`font-semibold text-white leading-snug ${
              compact ? 'text-base' : 'text-lg'
            }`}>
              {resource.title}
            </h3>

            {/* Author */}
            {resource.author && (
              <p className="text-sm text-zinc-400 mt-1">
                by {resource.author}
              </p>
            )}
          </div>

          {/* Category Badge */}
          <CategoryBadge category={resource.category as any} />
        </div>

        {/* Description */}
        {showDescription && resource.description && !compact && (
          <p className="text-sm text-zinc-300 leading-relaxed">
            {resource.description}
          </p>
        )}

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded-full"
              >
                {tag}
              </span>
            ))}
            {resource.tags.length > 4 && (
              <span className="px-2 py-1 text-xs text-zinc-500">
                +{resource.tags.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Metadata Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Difficulty */}
            {resource.difficulty_level && (
              <DifficultyIndicator level={resource.difficulty_level as any} />
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span>{resource.views || 0} views</span>
              {resource.quality_score > 0 && (
                <span>Score: {resource.quality_score.toFixed(1)}</span>
              )}
            </div>
          </div>

          {/* Vote Buttons */}
          {onVote && (
            <VoteButtons
              upvotes={resource.upvotes}
              downvotes={resource.downvotes}
              userVote={resource.user_vote}
              onVote={onVote}
              size={compact ? 'sm' : 'md'}
            />
          )}
        </div>

        {/* Submitter */}
        {showSubmitter && resource.submitted_by && !compact && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
            <div className="flex items-center gap-2">
              {resource.submitted_by.avatar_url ? (
                <img
                  src={resource.submitted_by.avatar_url}
                  alt={resource.submitted_by.display_name || resource.submitted_by.username}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-xs font-bold">
                  {(resource.submitted_by.display_name || resource.submitted_by.username)[0].toUpperCase()}
                </div>
              )}
              <div className="text-xs">
                <div className="text-zinc-300">
                  {resource.submitted_by.display_name || resource.submitted_by.username}
                </div>
                <div className="text-zinc-500">
                  {formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>

            {resource.is_genesis && (
              <span className="px-2 py-1 text-xs bg-brand/20 text-brand rounded-full">
                Genesis
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onExternalClick}
            className="flex-1 btn btn-default"
          >
            View Content
          </button>

          {onFavorite && (
            <button
              onClick={onFavorite}
              className={`btn btn-ghost px-3 ${
                resource.is_favorited ? 'text-red-400' : 'text-zinc-400'
              }`}
              title={resource.is_favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {resource.is_favorited ? '❤️' : '🤍'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  onVote: (voteType: 'up' | 'down') => void;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  showCounts?: boolean;
  disabled?: boolean;
  className?: string;
}

export function VoteButtons({
  upvotes,
  downvotes,
  userVote,
  onVote,
  size = 'md',
  orientation = 'horizontal',
  showCounts = true,
  disabled = false,
  className = '',
}: VoteButtonsProps) {
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (disabled || isVoting) return;

    setIsVoting(true);
    try {
      await onVote(voteType);
    } finally {
      setIsVoting(false);
    }
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg',
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const netScore = upvotes - downvotes;
  const containerClass = orientation === 'vertical'
    ? 'flex flex-col items-center gap-1'
    : 'flex items-center gap-2';

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Upvote Button */}
      <button
        onClick={() => handleVote('up')}
        disabled={disabled || isVoting}
        className={`
          vote-btn upvote transition-all duration-200
          ${sizeClasses[size]}
          ${userVote === 'up' ? 'active' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title="Upvote"
      >
        <ChevronUp size={iconSizes[size]} />
      </button>

      {/* Vote Count */}
      {showCounts && (
        <div className="flex items-center gap-1 text-sm">
          {orientation === 'vertical' ? (
            <div className="flex flex-col items-center text-xs">
              <span className={`font-medium ${
                netScore > 0 ? 'text-green-400' :
                netScore < 0 ? 'text-red-400' : 'text-zinc-400'
              }`}>
                {netScore > 0 ? '+' : ''}{netScore}
              </span>
            </div>
          ) : (
            <>
              <span className="text-green-400 font-medium">{upvotes}</span>
              <span className="text-zinc-500">|</span>
              <span className="text-red-400 font-medium">{downvotes}</span>
            </>
          )}
        </div>
      )}

      {/* Downvote Button */}
      <button
        onClick={() => handleVote('down')}
        disabled={disabled || isVoting}
        className={`
          vote-btn downvote transition-all duration-200
          ${sizeClasses[size]}
          ${userVote === 'down' ? 'active' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title="Downvote"
      >
        <ChevronDown size={iconSizes[size]} />
      </button>
    </div>
  );
}

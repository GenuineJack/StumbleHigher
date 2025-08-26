import { DifficultyLevel } from '@/types/database';

interface DifficultyIndicatorProps {
  level: DifficultyLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DIFFICULTY_CONFIGS = {
  beginner: {
    label: 'Beginner',
    dots: 1,
    color: 'text-green-400',
  },
  intermediate: {
    label: 'Intermediate',
    dots: 2,
    color: 'text-yellow-400',
  },
  advanced: {
    label: 'Advanced',
    dots: 3,
    color: 'text-red-400',
  },
} as const;

export function DifficultyIndicator({
  level,
  showLabel = false,
  size = 'md',
  className = ''
}: DifficultyIndicatorProps) {
  const config = DIFFICULTY_CONFIGS[level];

  if (!config) {
    return null;
  }

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`difficulty-indicator ${className}`}>
      <div className="flex items-center space-x-1">
        {[1, 2, 3].map((dot) => (
          <div
            key={dot}
            className={`
              difficulty-dot rounded-full
              ${dotSizes[size]}
              ${dot <= config.dots ? 'filled bg-brand' : 'empty bg-zinc-600'}
            `}
          />
        ))}
        {showLabel && (
          <span className={`ml-2 ${textSizes[size]} ${config.color}`}>
            {config.label}
          </span>
        )}
      </div>
    </div>
  );
}

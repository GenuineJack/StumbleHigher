import { ResourceCategory } from '@/types/database';

interface CategoryBadgeProps {
  category: ResourceCategory;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CATEGORY_CONFIGS = {
  books: {
    label: 'Book',
    icon: '📚',
    className: 'category-badge books',
  },
  articles: {
    label: 'Article',
    icon: '📄',
    className: 'category-badge articles',
  },
  videos: {
    label: 'Video',
    icon: '🎥',
    className: 'category-badge videos',
  },
  tools: {
    label: 'Tool',
    icon: '🛠️',
    className: 'category-badge tools',
  },
  research: {
    label: 'Research',
    icon: '🔬',
    className: 'category-badge research',
  },
  philosophy: {
    label: 'Philosophy',
    icon: '🤔',
    className: 'category-badge philosophy',
  },
} as const;

export function CategoryBadge({ category, size = 'md', className = '' }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIGS[category];

  if (!config) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span className={`${config.className} ${sizeClasses[size]} ${className}`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
}

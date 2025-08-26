'use client';

import { useState, useEffect } from 'react';
import { ResourceCategory, DifficultyLevel } from '@/types/database';
import { Globe, User, AlignLeft, Tag, Clock, BarChart3 } from 'lucide-react';

interface SubmissionData {
  title: string;
  author?: string;
  url: string;
  description?: string;
  category: string;
  tags?: string[];
  difficulty_level?: string;
  estimated_time_minutes?: number;
}

interface SubmissionFormProps {
  onSubmit: (data: SubmissionData) => void;
  initialData?: SubmissionData | null;
}

const CATEGORIES: { value: ResourceCategory; label: string; description: string }[] = [
  { value: 'books', label: '📚 Books', description: 'Full-length books and e-books' },
  { value: 'articles', label: '📄 Articles', description: 'Blog posts, essays, and written content' },
  { value: 'videos', label: '🎥 Videos', description: 'Educational videos, talks, and documentaries' },
  { value: 'tools', label: '🛠️ Tools', description: 'Software, apps, and useful utilities' },
  { value: 'research', label: '🔬 Research', description: 'Academic papers, studies, and reports' },
  { value: 'philosophy', label: '🤔 Philosophy', description: 'Philosophical works and thought pieces' },
];

const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Accessible to anyone, no prior knowledge needed' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some background knowledge helpful' },
  { value: 'advanced', label: 'Advanced', description: 'Requires significant expertise or experience' },
];

const SUGGESTED_TAGS = [
  'inspiring', 'educational', 'practical', 'creative', 'deep',
  'actionable', 'thought-provoking', 'comprehensive', 'innovative',
  'timeless', 'cutting-edge', 'foundational', 'transformative'
];

export function SubmissionForm({ onSubmit, initialData }: SubmissionFormProps) {
  const [formData, setFormData] = useState<SubmissionData>({
    title: '',
    author: '',
    url: '',
    description: '',
    category: '',
    tags: [],
    difficulty_level: 'intermediate',
    estimated_time_minutes: undefined,
    ...initialData,
  });

  const [errors, setErrors] = useState<Partial<SubmissionData>>({});
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [customTag, setCustomTag] = useState('');

  // Auto-extract metadata when URL changes
  useEffect(() => {
    if (formData.url && formData.url !== initialData?.url) {
      extractMetadata(formData.url);
    }
  }, [formData.url]);

  const extractMetadata = async (url: string) => {
    if (!isValidUrl(url)) return;

    setIsLoadingMetadata(true);
    try {
      // This would call our metadata extraction API
      // For now, we'll do basic URL-based inference
      const hostname = new URL(url).hostname.toLowerCase();

      // Infer category from URL
      let category = formData.category;
      if (!category) {
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be') || hostname.includes('vimeo')) {
          category = 'videos';
        } else if (hostname.includes('github.com') || hostname.includes('app') || hostname.includes('tool')) {
          category = 'tools';
        } else if (hostname.includes('arxiv') || hostname.includes('research') || hostname.includes('paper')) {
          category = 'research';
        } else if (url.includes('.pdf')) {
          category = 'books';
        } else {
          category = 'articles';
        }
      }

      // Estimate time based on content type
      let estimatedTime = formData.estimated_time_minutes;
      if (!estimatedTime) {
        if (category === 'videos') {
          estimatedTime = 30; // Average video length
        } else if (category === 'books') {
          estimatedTime = 300; // 5 hours for a book
        } else if (category === 'tools') {
          estimatedTime = 15; // Time to explore a tool
        } else {
          estimatedTime = 10; // Average article read time
        }
      }

      setFormData(prev => ({
        ...prev,
        category,
        estimated_time_minutes: estimatedTime,
      }));
    } catch (error) {
      console.error('Error extracting metadata:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SubmissionData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else if (!isValidUrl(formData.url)) {
      newErrors.url = 'Please enter a valid URL';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (formData.author && formData.author.length > 100) {
      newErrors.author = 'Author name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = <K extends keyof SubmissionData>(
    field: K,
    value: SubmissionData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags?.includes(tag) && formData.tags!.length < 10) {
      handleInputChange('tags', [...(formData.tags || []), tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const addCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim().toLowerCase());
      setCustomTag('');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Submit Content</h2>
        <p className="text-zinc-400">
          Share valuable content that pushes thinking higher
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL Field */}
        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <Globe size={16} />
            Content URL *
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => handleInputChange('url', e.target.value)}
            className={`input ${errors.url ? 'border-red-500' : ''}`}
            placeholder="https://example.com/amazing-content"
          />
          {errors.url && <div className="form-error">{errors.url}</div>}
          {isLoadingMetadata && (
            <div className="text-xs text-brand mt-1">Extracting metadata...</div>
          )}
        </div>

        {/* Title Field */}
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`input ${errors.title ? 'border-red-500' : ''}`}
            placeholder="Enter the content title"
            maxLength={200}
          />
          {errors.title && <div className="form-error">{errors.title}</div>}
          <div className="text-xs text-zinc-500 mt-1">
            {formData.title.length}/200 characters
          </div>
        </div>

        {/* Author Field */}
        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <User size={16} />
            Author
          </label>
          <input
            type="text"
            value={formData.author}
            onChange={(e) => handleInputChange('author', e.target.value)}
            className={`input ${errors.author ? 'border-red-500' : ''}`}
            placeholder="Content author or creator"
            maxLength={100}
          />
          {errors.author && <div className="form-error">{errors.author}</div>}
        </div>

        {/* Category Field */}
        <div className="form-group">
          <label className="form-label">Category *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((category) => (
              <label
                key={category.value}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.category === category.value
                    ? 'border-brand bg-brand/10'
                    : 'border-zinc-600 hover:border-zinc-500'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={category.value}
                  checked={formData.category === category.value}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="sr-only"
                />
                <div className="font-medium text-white text-sm mb-1">
                  {category.label}
                </div>
                <div className="text-xs text-zinc-400">
                  {category.description}
                </div>
              </label>
            ))}
          </div>
          {errors.category && <div className="form-error">{errors.category}</div>}
        </div>

        {/* Description Field */}
        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <AlignLeft size={16} />
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className={`input min-h-[100px] resize-y ${errors.description ? 'border-red-500' : ''}`}
            placeholder="Brief description of what makes this content valuable..."
            maxLength={1000}
          />
          {errors.description && <div className="form-error">{errors.description}</div>}
          <div className="text-xs text-zinc-500 mt-1">
            {(formData.description?.length || 0)}/1000 characters
          </div>
        </div>

        {/* Tags Field */}
        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            <Tag size={16} />
            Tags (up to 10)
          </label>

          {/* Selected Tags */}
          {formData.tags && formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-brand text-white text-sm rounded-full flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Suggested Tags */}
          <div className="space-y-2">
            <div className="text-sm text-zinc-400">Suggested tags:</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  disabled={formData.tags?.includes(tag) || (formData.tags?.length || 0) >= 10}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm rounded-full transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tag Input */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
              className="input flex-1"
              placeholder="Add custom tag..."
              maxLength={20}
              disabled={(formData.tags?.length || 0) >= 10}
            />
            <button
              type="button"
              onClick={addCustomTag}
              disabled={!customTag.trim() || (formData.tags?.length || 0) >= 10}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Difficulty and Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Difficulty Level */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <BarChart3 size={16} />
              Difficulty Level
            </label>
            <select
              value={formData.difficulty_level}
              onChange={(e) => handleInputChange('difficulty_level', e.target.value as DifficultyLevel)}
              className="input"
            >
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-zinc-400 mt-1">
              {DIFFICULTY_LEVELS.find(l => l.value === formData.difficulty_level)?.description}
            </div>
          </div>

          {/* Estimated Time */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Clock size={16} />
              Estimated Time (minutes)
            </label>
            <input
              type="number"
              value={formData.estimated_time_minutes || ''}
              onChange={(e) => handleInputChange('estimated_time_minutes', e.target.value ? parseInt(e.target.value) : undefined)}
              className="input"
              placeholder="30"
              min="1"
              max="10080"
            />
            <div className="text-xs text-zinc-400 mt-1">
              How long does it take to consume this content?
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-zinc-700">
          <button
            type="submit"
            className="w-full btn btn-default py-3 text-lg"
          >
            Continue to Payment
          </button>
        </div>
      </form>
    </div>
  );
}

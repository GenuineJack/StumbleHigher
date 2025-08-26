'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';
import { ResourceWithVotes } from '@/types/database';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ContentViewerProps {
  resource: ResourceWithVotes;
  onExternalClick: () => void;
  loading?: boolean;
}

export function ContentViewer({ resource, onExternalClick, loading = false }: ContentViewerProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [src, setSrc] = useState<string>('');

  // Generate proxy URL or direct URL based on content type
  useEffect(() => {
    if (!resource) return;

    const url = resource.url;

    // Check if it's a YouTube video
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';

      if (url.includes('youtube.com/watch')) {
        videoId = new URL(url).searchParams.get('v') || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('/').pop()?.split('?')[0] || '';
      }

      if (videoId) {
        setSrc(`https://www.youtube.com/embed/${videoId.substring(0, 11)}`);
        return;
      }
    }

    // Check if it's a Vimeo video
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      if (videoId) {
        setSrc(`https://player.vimeo.com/video/${videoId}`);
        return;
      }
    }

    // For other content, use our proxy
    const proxyUrl = `/api/proxy?u=${encodeURIComponent(url)}&ua=${encodeURIComponent(navigator.userAgent)}`;
    setSrc(proxyUrl);
  }, [resource]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeError(true);
  };

  const getContentTypeLabel = () => {
    const url = resource.url.toLowerCase();

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'YouTube Video';
    }
    if (url.includes('vimeo.com')) {
      return 'Vimeo Video';
    }
    if (url.includes('.pdf')) {
      return 'PDF Document';
    }
    if (resource.category === 'tools') {
      return 'Interactive Tool';
    }
    if (resource.category === 'videos') {
      return 'Video Content';
    }

    return 'Web Content';
  };

  if (!resource) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-800">
        <div className="text-zinc-400">No content selected</div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-zinc-800">
      {/* Loading Overlay */}
      {(loading || iframeLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 z-10">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <div className="mt-4 text-zinc-400">Loading content...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 z-10">
          <div className="text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Content Unavailable
            </h3>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              This content cannot be displayed in a frame. You can view it directly by clicking the button below.
            </p>
            <button
              onClick={onExternalClick}
              className="btn-brand flex items-center gap-2 mx-auto"
            >
              <ExternalLink size={18} />
              Open in New Tab
            </button>
            <div className="mt-4 text-xs text-zinc-500">
              {getContentTypeLabel()} • {new URL(resource.url).hostname}
            </div>
          </div>
        </div>
      )}

      {/* Content Type Indicator */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white">
          {getContentTypeLabel()}
        </div>
      </div>

      {/* External Link Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={onExternalClick}
          className="bg-black/50 backdrop-blur-sm p-2 rounded-full text-white hover:bg-black/70 transition-colors"
          title="Open in new tab"
        >
          <ExternalLink size={18} />
        </button>
      </div>

      {/* Main Content Iframe */}
      {src && (
        <iframe
          src={src}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}

      {/* Content Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-20">
        <div className="flex items-center justify-between text-white">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {resource.title}
            </div>
            {resource.author && (
              <div className="text-xs text-zinc-300 truncate">
                by {resource.author}
              </div>
            )}
          </div>

          <div className="ml-4 flex items-center gap-2">
            {resource.estimated_time_minutes && (
              <span className="text-xs bg-black/50 px-2 py-1 rounded">
                {resource.estimated_time_minutes < 60
                  ? `${resource.estimated_time_minutes}m`
                  : `${Math.round(resource.estimated_time_minutes / 60)}h`
                }
              </span>
            )}

            {resource.quality_score > 0 && (
              <span className="text-xs bg-brand/20 text-brand px-2 py-1 rounded">
                ⭐ {resource.quality_score.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { CheckCircle, ExternalLink, Home, Plus, Share2 } from 'lucide-react';
import { ResourceWithSubmitter } from '@/types/database';

interface SuccessStepProps {
  resource: ResourceWithSubmitter;
  transactionHash?: string | null;
  onStartOver: () => void;
}

export function SuccessStep({ resource, transactionHash, onStartOver }: SuccessStepProps) {
  const handleShare = async () => {
    const shareText = `I just submitted "${resource.title}" to Stumble Higher! Check it out and discover more amazing content.`;
    const shareUrl = `${window.location.origin}/resource/${resource.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Content Submitted to Stumble Higher',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      // Could show a toast here
    }
  };

  return (
    <div className="p-6 text-center">
      {/* Success Icon and Message */}
      <div className="mb-6">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-white" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Content Submitted Successfully!
        </h2>
        <p className="text-zinc-400">
          Your content is now being reviewed by the community
        </p>
      </div>

      {/* Resource Info */}
      <div className="bg-zinc-700 rounded-lg p-4 mb-6 text-left">
        <h3 className="text-lg font-semibold text-white mb-3">Submitted Content</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-zinc-400">Title:</span>{' '}
            <span className="text-white">{resource.title}</span>
          </div>
          {resource.author && (
            <div>
              <span className="text-zinc-400">Author:</span>{' '}
              <span className="text-white">{resource.author}</span>
            </div>
          )}
          <div>
            <span className="text-zinc-400">Category:</span>{' '}
            <span className="text-white capitalize">{resource.category}</span>
          </div>
          <div>
            <span className="text-zinc-400">Status:</span>{' '}
            <span className="text-yellow-400 capitalize">{resource.status}</span>
          </div>
          <div>
            <span className="text-zinc-400">Resource ID:</span>{' '}
            <span className="text-white font-mono">#{resource.id?.slice(-8)}</span>
          </div>
        </div>

        {/* Transaction Info */}
        {transactionHash && (
          <div className="mt-4 pt-4 border-t border-zinc-600">
            <div className="text-zinc-400 text-sm mb-2">Payment Transaction:</div>
            <a
              href={`https://basescan.org/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline text-sm break-all flex items-center gap-1"
            >
              {transactionHash} <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {/* What Happens Next */}
      <div className="bg-zinc-700 rounded-lg p-4 mb-6 text-left">
        <h3 className="text-lg font-semibold text-white mb-3">What Happens Next?</h3>
        <div className="space-y-3 text-sm text-zinc-300">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <div className="font-medium text-white">Community Review</div>
              <div>Your content will be reviewed and voted on by the community</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <div className="font-medium text-white">Automatic Approval</div>
              <div>High-quality content gets automatically approved based on community votes</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <div className="font-medium text-white">Weekly Rewards</div>
              <div>Top content earns $HIGHER token rewards every week</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Potential */}
      <div className="bg-gradient-to-r from-brand/20 to-yellow-500/20 border border-brand/30 rounded-lg p-4 mb-6">
        <div className="text-brand font-semibold mb-2">💰 Earning Potential</div>
        <div className="text-sm text-zinc-300">
          High-quality content can earn back your submission cost and more through weekly community rewards!
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/stumble"
            className="btn btn-default flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Start Stumbling
          </Link>
          <button
            onClick={handleShare}
            className="btn btn-secondary flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Share Success
          </button>
        </div>

        <button
          onClick={onStartOver}
          className="w-full btn btn-ghost flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Submit Another
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-6 border-t border-zinc-700 text-xs text-zinc-400">
        <p className="mb-2">
          Track your submission's progress and earnings in your profile dashboard.
        </p>
        <p>
          Questions? Check out our{' '}
          <a href="/help" className="text-brand hover:underline">
            submission guidelines
          </a>{' '}
          or{' '}
          <a href="/contact" className="text-brand hover:underline">
            contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}

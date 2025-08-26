'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useWeb3, useSubmissionPayment, useHigherBalance } from '@/providers/Web3Provider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Wallet, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

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

interface PaymentStepProps {
  submissionData: SubmissionData;
  onPaymentComplete: (transactionHash: string) => void;
  onPaymentError: (error: string) => void;
  onBack: () => void;
}

export function PaymentStep({
  submissionData,
  onPaymentComplete,
  onPaymentError,
  onBack
}: PaymentStepProps) {
  const { user } = useAuth();
  const { contracts } = useWeb3();
  const { payForSubmission, isSubmitting, txHash } = useSubmissionPayment();
  const { balance, loading: balanceLoading, fetchBalance } = useHigherBalance();

  const [paymentState, setPaymentState] = useState<'idle' | 'paying' | 'confirming' | 'complete'>('idle');
  const [error, setError] = useState<string | null>(null);

  const SUBMISSION_COST = 1000; // $HIGHER tokens

  // Fetch user's HIGHER balance when component mounts
  useEffect(() => {
    if (user?.eth_address) {
      fetchBalance(user.eth_address);
    }
  }, [user?.eth_address, fetchBalance]);

  const handlePayment = async () => {
    setError(null);
    setPaymentState('paying');

    try {
      const result = await payForSubmission(SUBMISSION_COST);

      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      setPaymentState('confirming');

      // The transaction hash will be available from the hook
      if (result.txHash) {
        setPaymentState('complete');
        onPaymentComplete(result.txHash);
      }
    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      setPaymentState('idle');
      onPaymentError(errorMessage);
    }
  };

  const hasInsufficientBalance = () => {
    return !balanceLoading && balance && parseInt(balance) < SUBMISSION_COST;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to form
        </button>
        <h2 className="text-2xl font-bold text-white mb-2">Payment Required</h2>
        <p className="text-zinc-400">
          Pay {SUBMISSION_COST.toLocaleString()} $HIGHER tokens to submit your content
        </p>
      </div>

      {/* Content Preview */}
      <div className="bg-zinc-700 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Content Summary</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-zinc-400">Title:</span>{' '}
            <span className="text-white">{submissionData.title}</span>
          </div>
          {submissionData.author && (
            <div>
              <span className="text-zinc-400">Author:</span>{' '}
              <span className="text-white">{submissionData.author}</span>
            </div>
          )}
          <div>
            <span className="text-zinc-400">Category:</span>{' '}
            <span className="text-white capitalize">{submissionData.category}</span>
          </div>
          <div>
            <span className="text-zinc-400">URL:</span>{' '}
            <a
              href={submissionData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline break-all"
            >
              {submissionData.url}
            </a>
          </div>
        </div>
      </div>

      {/* Wallet Info */}
      <div className="bg-zinc-700 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Wallet size={20} className="text-brand" />
          <h3 className="text-lg font-semibold text-white">Wallet Information</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Your $HIGHER Balance:</span>
            {balanceLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span className={`font-semibold ${
                hasInsufficientBalance() ? 'text-red-400' : 'text-green-400'
              }`}>
                {balance ? parseInt(balance).toLocaleString() : '0'} $HIGHER
              </span>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Submission Cost:</span>
            <span className="font-semibold text-white">
              {SUBMISSION_COST.toLocaleString()} $HIGHER
            </span>
          </div>

          <div className="pt-2 border-t border-zinc-600">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">After Payment:</span>
              <span className="font-semibold text-white">
                {balance ? (parseInt(balance) - SUBMISSION_COST).toLocaleString() : '0'} $HIGHER
              </span>
            </div>
          </div>
        </div>

        {/* Insufficient Balance Warning */}
        {hasInsufficientBalance() && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-600 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
            <div className="text-sm">
              <div className="text-red-400 font-medium mb-1">Insufficient Balance</div>
              <div className="text-zinc-300">
                You need {(SUBMISSION_COST - (parseInt(balance) || 0)).toLocaleString()} more $HIGHER tokens to submit content.
              </div>
              <a
                href={`https://uniswap.org/swap?outputCurrency=${contracts.higherToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline mt-2"
              >
                Buy $HIGHER <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Payment Flow */}
      <div className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-600 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
            <div className="text-sm">
              <div className="text-red-400 font-medium mb-1">Payment Failed</div>
              <div className="text-zinc-300">{error}</div>
            </div>
          </div>
        )}

        {/* Payment Status */}
        {paymentState !== 'idle' && (
          <div className="bg-zinc-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              {paymentState === 'complete' ? (
                <CheckCircle className="text-green-400" size={20} />
              ) : (
                <LoadingSpinner size="sm" />
              )}
              <div>
                <div className="font-medium text-white">
                  {paymentState === 'paying' && 'Processing Payment...'}
                  {paymentState === 'confirming' && 'Confirming Transaction...'}
                  {paymentState === 'complete' && 'Payment Confirmed!'}
                </div>
                <div className="text-sm text-zinc-400">
                  {paymentState === 'paying' && 'Please confirm the transaction in your wallet'}
                  {paymentState === 'confirming' && 'Waiting for blockchain confirmation'}
                  {paymentState === 'complete' && 'Your content is being submitted'}
                </div>
              </div>
            </div>

            {txHash && (
              <div className="mt-3 pt-3 border-t border-zinc-600">
                <div className="text-xs text-zinc-400 mb-1">Transaction Hash:</div>
                <a
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline text-sm break-all flex items-center gap-1"
                >
                  {txHash} <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={
            isSubmitting ||
            paymentState !== 'idle' ||
            hasInsufficientBalance() ||
            balanceLoading
          }
          className="w-full btn btn-default py-4 text-lg flex items-center justify-center gap-3"
        >
          {isSubmitting || paymentState !== 'idle' ? (
            <>
              <LoadingSpinner size="sm" color="white" />
              <span>
                {paymentState === 'paying' && 'Processing Payment...'}
                {paymentState === 'confirming' && 'Confirming...'}
                {paymentState === 'complete' && 'Submitting Content...'}
              </span>
            </>
          ) : (
            <>
              <Wallet size={20} />
              <span>Pay {SUBMISSION_COST.toLocaleString()} $HIGHER</span>
            </>
          )}
        </button>

        {/* Info Text */}
        <div className="text-xs text-zinc-400 text-center space-y-1">
          <p>
            By submitting, you agree that your content will be reviewed by the community.
          </p>
          <p>
            High-quality content earns weekly rewards based on community votes.
          </p>
        </div>
      </div>
    </div>
  );
}

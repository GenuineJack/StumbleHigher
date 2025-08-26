'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useWeb3, useSubmissionPayment } from '@/providers/Web3Provider';
import { useToast } from '@/providers/ToastProvider';
import { SubmissionForm } from '@/components/submit/SubmissionForm';
import { PaymentStep } from '@/components/submit/PaymentStep';
import { SuccessStep } from '@/components/submit/SuccessStep';
import { AuthButton } from '@/components/auth/AuthButton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type SubmissionStep = 'form' | 'payment' | 'success';

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

export default function SubmitPage() {
  const { user, isAuthenticated } = useAuth();
  const { contracts } = useWeb3();
  const { payForSubmission, isSubmitting, txHash } = useSubmissionPayment();
  const { success, error } = useToast();

  const [currentStep, setCurrentStep] = useState<SubmissionStep>('form');
  const [submissionData, setSubmissionData] = useState<SubmissionData | null>(null);
  const [submittedResource, setSubmittedResource] = useState<any>(null);

  const handleFormSubmit = (data: SubmissionData) => {
    setSubmissionData(data);
    setCurrentStep('payment');
  };

  const handlePaymentComplete = async (transactionHash: string) => {
    if (!submissionData) return;

    try {
      // Submit resource to backend with transaction hash
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submissionData,
          submission_tx_hash: transactionHash,
          submission_amount: 1000, // Default amount
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit resource');
      }

      setSubmittedResource(result.data);
      setCurrentStep('success');
      success('Resource submitted successfully!');
    } catch (err) {
      console.error('Resource submission error:', err);
      error(err instanceof Error ? err.message : 'Failed to submit resource');
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    error(errorMessage);
    setCurrentStep('form');
  };

  const handleStartOver = () => {
    setCurrentStep('form');
    setSubmissionData(null);
    setSubmittedResource(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Submit Content</h1>
            <p className="text-zinc-400 mb-8">
              Share valuable content with the Stumble Higher community
            </p>

            <div className="bg-zinc-800 rounded-lg p-8 border border-zinc-700">
              <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
              <p className="text-zinc-300 mb-6">
                You need to be signed in to submit content to Stumble Higher.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <AuthButton />
                <Link
                  href="/"
                  className="btn btn-secondary"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Submit Content</h1>
            <p className="text-zinc-400">
              Share valuable content with the community
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {/* Step 1 */}
            <div className={`flex items-center ${
              currentStep === 'form' ? 'text-brand' :
              ['payment', 'success'].includes(currentStep) ? 'text-green-400' : 'text-zinc-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep === 'form' ? 'bg-brand text-white' :
                ['payment', 'success'].includes(currentStep) ? 'bg-green-400 text-white' : 'bg-zinc-700'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Content Details</span>
            </div>

            {/* Connector */}
            <div className={`w-8 h-0.5 ${
              ['payment', 'success'].includes(currentStep) ? 'bg-green-400' : 'bg-zinc-600'
            }`} />

            {/* Step 2 */}
            <div className={`flex items-center ${
              currentStep === 'payment' ? 'text-brand' :
              currentStep === 'success' ? 'text-green-400' : 'text-zinc-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep === 'payment' ? 'bg-brand text-white' :
                currentStep === 'success' ? 'bg-green-400 text-white' : 'bg-zinc-700'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Payment</span>
            </div>

            {/* Connector */}
            <div className={`w-8 h-0.5 ${
              currentStep === 'success' ? 'bg-green-400' : 'bg-zinc-600'
            }`} />

            {/* Step 3 */}
            <div className={`flex items-center ${
              currentStep === 'success' ? 'text-green-400' : 'text-zinc-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep === 'success' ? 'bg-green-400 text-white' : 'bg-zinc-700'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          {currentStep === 'form' && (
            <SubmissionForm
              onSubmit={handleFormSubmit}
              initialData={submissionData}
            />
          )}

          {currentStep === 'payment' && submissionData && (
            <PaymentStep
              submissionData={submissionData}
              onPaymentComplete={handlePaymentComplete}
              onPaymentError={handlePaymentError}
              onBack={() => setCurrentStep('form')}
            />
          )}

          {currentStep === 'success' && submittedResource && (
            <SuccessStep
              resource={submittedResource}
              transactionHash={txHash}
              onStartOver={handleStartOver}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-zinc-400">
          <p>
            Submission costs 1,000 $HIGHER tokens. Your content will be reviewed by the community.
          </p>
          <p className="mt-1">
            High-quality content earns weekly rewards based on community votes.
          </p>
        </div>
      </div>
    </div>
  );
}

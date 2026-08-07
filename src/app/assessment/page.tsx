'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/store/assessmentStore';
import ProgressBar from '@/components/assessment/ProgressBar';
import Step1Financial from '@/components/assessment/Step1Financial';
import Step2Longevity from '@/components/assessment/Step2Longevity';
import Step3Priorities from '@/components/assessment/Step3Priorities';

export default function AssessmentPage() {
  const { step } = useAssessmentStore();
  const router = useRouter();

  useEffect(() => {
    if (step === 4) {
      router.push('/assessment/results');
    }
  }, [step, router]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  if (step === 4) return null;

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Brand bar */}
        <div className="mb-8 flex items-center justify-between">
          <a href="/" className="font-serif text-xl font-bold text-navy">
  RetireEngine
</a>
          <p className="text-xs text-slate-500">Free Assessment · Takes ~4 minutes</p>
        </div>

        <ProgressBar currentStep={step} />

        {step === 1 && <Step1Financial />}
        {step === 2 && <Step2Longevity />}
        {step === 3 && <Step3Priorities />}
      </div>
    </main>
  );
}

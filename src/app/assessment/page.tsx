'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessmentStore } from '@/store/assessmentStore';
import ProgressBar from '@/components/assessment/ProgressBar';
import Step1Financial from '@/components/assessment/Step1Financial';
import Step2Longevity from '@/components/assessment/Step2Longevity';
import Step3Priorities from '@/components/assessment/Step3Priorities';

function AssessmentPageInner() {
  const { step, setStep } = useAssessmentStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent');

  // Arriving via a homepage Gate (intent param present) always starts fresh at
  // Step 1 — otherwise persisted progress from a prior session silently resumes,
  // making the gate look broken (reported: "2nd & 3rd buttons not functioning").
  useEffect(() => {
    if (intent && step !== 1) {
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

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
          <p className="text-base text-slate-500">Free Assessment · Takes ~4 minutes</p>
        </div>

        <ProgressBar currentStep={step} />
        {step === 1 && <Step1Financial />}
        {step === 2 && <Step2Longevity />}
        {step === 3 && <Step3Priorities />}
      </div>
    </main>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={null}>
      <AssessmentPageInner />
    </Suspense>
  );
}
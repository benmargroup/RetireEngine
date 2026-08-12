'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/store/assessmentStore';
import ProgressBar from '@/components/assessment/ProgressBar';
import Step4Results from '@/components/assessment/Step4Results';

export default function ResultsPage() {
  const { results, setStep } = useAssessmentStore();
  const router = useRouter();

  useEffect(() => {
    if (results.length === 0) {
      router.replace('/assessment');
    }
  }, [results, router]);

  if (results.length === 0) return null;

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <a href="/" className="font-serif text-xl font-bold text-navy">
            RetireEngine
          </a>
          <button
            type="button"
            onClick={() => { setStep(3); router.push('/assessment'); }}
            className="text-base text-slate-500 underline hover:text-navy"
          >
            ← Revise priorities
          </button>
        </div>

        <ProgressBar currentStep={4} />
        <Step4Results />
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/store/assessmentStore';
import ProgressBar from '@/components/assessment/ProgressBar';
import Step1Financial from '@/components/assessment/Step1Financial';
import Step2Longevity from '@/components/assessment/Step2Longevity';
import Step3Priorities from '@/components/assessment/Step3Priorities';

export default function AssessmentPageClient({ intent, session }: { intent?: string; session?: string }) {
  const { step, setStep, setStep1, setStep2, setStep3, setPassportProfile } = useAssessmentStore();
  const router = useRouter();
  const [restoring, setRestoring] = useState(!!session);

  // Magic-link restore: if a session token is present, fetch the saved
  // assessment data BEFORE rendering Step 1, so the Welcome Back banner's
  // one-time "had saved data" check correctly sees the restored values.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/session-restore?token=${encodeURIComponent(session)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            if (data.step1) setStep1(data.step1);
            if (data.step2) setStep2(data.step2);
            if (data.step3) setStep3(data.step3);
            if (data.passportProfile) setPassportProfile(data.passportProfile);
            setStep(1);
          }
        }
      } catch (err) {
        console.error('[session-restore] fetch failed (non-fatal):', err);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    // Don't act on a possibly-stale persisted step value while a magic-link
    // restore is actively resolving — it will set the correct step itself.
    if (restoring) return;
    if (step === 4) {
      router.push('/assessment/results');
    }
  }, [step, router, restoring]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  if (restoring) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-base text-navy">Restoring your saved data…</p>
      </main>
    );
  }

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
        {step === 1 && <Step1Financial intent={intent} />}
        {step === 2 && <Step2Longevity />}
        {step === 3 && <Step3Priorities />}
      </div>
    </main>
  );
}
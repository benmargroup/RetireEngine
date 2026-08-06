'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Mail, Download } from 'lucide-react';
import { useAssessmentStore } from '@/store/assessmentStore';

function ReportContent() {
  const searchParams = useSearchParams();
  const { email, selectedTier, results, setPaymentConfirmed, reset } = useAssessmentStore();

  const sessionId = searchParams.get('session');
  const tierParam = searchParams.get('tier') ?? selectedTier ?? 'standard';
  const emailParam = searchParams.get('email') ?? email;
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    if (sessionId) {
      setPaymentConfirmed(true);
      const url = `/api/send-report?session=${sessionId}&tier=${tierParam}&email=${encodeURIComponent(emailParam)}`;
      setDownloadUrl(url);
    }
  }, [sessionId, tierParam, emailParam, setPaymentConfirmed]);

  const topCountry = results[0];

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
      </div>

      <div>
        <h1 className="mb-2 font-serif text-2xl font-bold text-navy">Your Report is On Its Way!</h1>
        <p className="text-sm text-slate-600">
          Your personalized retirement abroad blueprint ({tierParam === 'premium' ? 'Premium' : 'Standard'}) has been
          generated and sent to <strong>{emailParam}</strong>.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center justify-center gap-2 text-emerald-800">
          <Mail size={18} />
          <span className="text-sm font-semibold">Check your inbox — delivery takes under 2 minutes</span>
        </div>
        <p className="mt-1 text-xs text-emerald-700">Check spam if you don&apos;t see it. Subject: &ldquo;Your Lifetime SS Retirement Blueprint&rdquo;</p>
      </div>

      {topCountry && (
        <div className="rounded-xl border border-gold/30 bg-cream p-4 text-left">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sage">Your Top Match</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{topCountry.flag}</span>
            <div>
              <p className="font-serif text-lg font-bold text-navy">{topCountry.name}</p>
              <p className="text-sm text-slate-600">Score: {topCountry.score}/100 · {topCountry.visaName}</p>
            </div>
          </div>
        </div>
      )}

      {downloadUrl && (
        <a
          href={downloadUrl}
          className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white hover:bg-navy-light"
        >
          <Download size={16} />
          Download PDF Directly
        </a>
      )}

      <div className="border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={reset}
          className="text-sm text-slate-500 underline hover:text-navy"
        >
          Start a new assessment
        </button>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <a href="/" className="font-serif text-xl font-bold text-navy">
            Lifetime<span className="text-gold">SS</span>
          </a>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-slate-500">Loading your report status…</div>}>
          <ReportContent />
        </Suspense>
      </div>
    </main>
  );
}

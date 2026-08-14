'use client';

import { useEffect, useState, Suspense } from 'react';
import { CheckCircle, Mail, Download } from 'lucide-react';
import { useAssessmentStore } from '@/store/assessmentStore';
import { useSearchParams, useRouter } from 'next/navigation';

function AccountCreationPrompt({ email, sessionId }: { email: string; sessionId: string }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreated(true);
      } else if (res.status === 409) {
        setError('You already have an account with this email — sign in to access your reports.');
      } else {
        setError(data.error ?? 'Could not create account. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left">
        <p className="text-base font-semibold text-emerald-800">Account created!</p>
        <p className="mt-1 text-base text-emerald-700">
          You can now sign in anytime to access this report using {email}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gold/30 bg-white p-5 text-left">
      <p className="mb-1 text-base font-bold text-navy">Save this report to your account</p>
      <p className="mb-3 text-base text-slate-600">
        Create a free account to access this report anytime — no need to keep the email link.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-base font-semibold text-navy">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-gold focus:ring-1 focus:ring-gold"
          />
        </div>
        {error && <p className="text-base text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-navy py-2.5 text-base font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:bg-navy-light"
        >
          {loading ? 'Creating account…' : 'Create Free Account'}
        </button>
      </form>
      <p className="mt-2 text-base text-slate-400">Using {email}</p>
    </div>
  );
}

function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
        <p className="text-base text-slate-600">
          Your personalized retirement abroad blueprint ({tierParam === 'premium' ? 'Premium' : 'Standard'}) has been
          generated and sent to <strong>{emailParam}</strong>.
        </p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center justify-center gap-2 text-emerald-800">
          <Mail size={18} />
          <span className="text-base font-semibold">Check your inbox — delivery takes under 2 minutes</span>
        </div>
        <p className="mt-1 text-base text-emerald-700">Check spam if you don&apos;t see it. Subject: &ldquo;Your RetireEngine Retirement Blueprint&rdquo;</p>
      </div>
      {topCountry && (
        <div className="rounded-xl border border-gold/30 bg-cream p-4 text-left">
          <p className="mb-1 text-base font-bold uppercase tracking-wide text-sage">Your Top Match</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{topCountry.flag}</span>
            <div>
              <p className="font-serif text-lg font-bold text-navy">{topCountry.name}</p>
              <p className="text-base text-slate-600">Score: {topCountry.score}/100 · {topCountry.visaName}</p>
            </div>
          </div>
        </div>
      )}
      {downloadUrl && (
        <a
          href={downloadUrl}
          className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-base font-bold text-white hover:bg-navy-light"
        >
          <Download size={16} />
          Download PDF Directly
        </a>
      )}
      {tierParam === 'premium' && emailParam && sessionId && (
        <AccountCreationPrompt email={emailParam} sessionId={sessionId} />
      )}
      <div className="border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => {
            reset();
            router.push('/assessment');
          }}
          className="text-base text-slate-500 underline hover:text-navy"
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
            RetireEngine
          </a>
        </div>
        <Suspense fallback={<div className="text-center text-base text-slate-500">Loading your report status…</div>}>
          <ReportContent />
        </Suspense>
      </div>
    </main>
  );
}
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Info } from 'lucide-react';
import { useAssessmentStore } from '@/store/assessmentStore';
import type { ReportTier } from '@/types/assessment';

const TIER_DETAILS = {
  standard: {
    label: 'Standard Report',
    price: '$19',
    pages: 8,
    features: [
      'Cover page + executive summary',
      'Your financial & SS claiming analysis',
      'Your Vitality Window breakdown',
      'Top 3 country deep dives',
      'All 10 countries comparison matrix',
      '30-day action checklist',
    ],
  },
  premium: {
    label: 'Premium Report',
    price: '$49',
    pages: 11,
    features: [
      'Everything in Standard',
      'US expat tax framework (FEIE, FTC, state domicile)',
      'Medicare vs. international health insurance roadmap',
      '90-day action plan with specific next steps',
    ],
  },
} as const;

const AFFILIATE_DISCLOSURE =
  'Some professional referrals and product links are affiliate or referral partnerships; we may earn a fee at no extra cost to you. This never changes your price or your rankings.';

const PERSISTENT_DISCLAIMER =
  'Educational planning estimates based on 2026 rules and simplified assumptions. Not financial, tax, or legal advice. Verify with a licensed professional.';

function CheckoutForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    results, step1, step2, step3,
    setSelectedTier, setEmail, setName, email, name,
    notAdviceAck, setNotAdviceAck,
    referralConsent, setReferralConsent,
  } = useAssessmentStore();

  const tierParam = searchParams.get('tier') as ReportTier | null;
  const [tier, setTier] = useState<ReportTier>(tierParam === 'standard' || tierParam === 'premium' ? tierParam : 'premium');
  const [localEmail, setLocalEmail] = useState(email);
  const [localName, setLocalName] = useState(name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (results.length === 0) router.replace('/assessment');
  }, [results, router]);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!localEmail || !localName) {
      setError('Please enter your name and email.');
      return;
    }
    if (!notAdviceAck) {
      setError('Please acknowledge the disclaimer before continuing.');
      return;
    }
    setError('');
    setLoading(true);
    setEmail(localEmail);
    setName(localName);
    setSelectedTier(tier);

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          email: localEmail,
          name: localName,
          step1,
          step2,
          step3,
          results,
          notAdviceAck,
          referralConsent,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.devMode) {
        router.push(`/assessment/report?session=dev&tier=${tier}&email=${encodeURIComponent(localEmail)}`);
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const details = TIER_DETAILS[tier];

  return (
    <div className="space-y-6">
      {/* Persistent disclaimer */}
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
        {PERSISTENT_DISCLAIMER}
      </div>

      {/* Tier selector */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(['standard', 'premium'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              tier === t ? 'border-gold bg-navy text-white' : 'border-slate-200 bg-white hover:border-gold/50'
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wide ${tier === t ? 'text-gold/70' : 'text-slate-500'}`}>
              {TIER_DETAILS[t].label}
            </p>
            <p className={`my-0.5 font-serif text-2xl font-bold ${tier === t ? 'text-gold' : 'text-navy'}`}>
              {TIER_DETAILS[t].price}
            </p>
            <p className={`text-xs ${tier === t ? 'text-cream/70' : 'text-slate-400'}`}>
              {TIER_DETAILS[t].pages}-page personalized PDF
            </p>
          </button>
        ))}
      </div>

      {/* Features */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">What&apos;s included</p>
        <ul className="space-y-1.5">
          {details.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-emerald-500">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <form onSubmit={handleCheckout} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-semibold text-navy">Full name</label>
          <input
            type="text"
            required
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-navy">Email</label>
          <input
            type="email"
            required
            value={localEmail}
            onChange={(e) => setLocalEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold"
          />
          <p className="mt-1 text-xs text-slate-500">Your report will be emailed here within 2 minutes.</p>
        </div>

        {/* notAdviceAck — gates the pay button; required */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={notAdviceAck}
            onChange={(e) => setNotAdviceAck(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-gold"
          />
          <span className="text-xs leading-relaxed text-slate-700">
            I understand this report is an educational planning tool — not financial, tax, immigration, or legal advice — and I should verify all figures with a licensed professional before acting.
          </span>
        </label>

        {/* referralConsent — optional */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <input
            type="checkbox"
            checked={referralConsent}
            onChange={(e) => setReferralConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-gold"
          />
          <span className="text-xs leading-relaxed text-slate-600">
            Match me with a vetted independent professional and share the details I entered for that purpose. I understand these may be affiliate/referral partners and I&apos;m under no obligation.
          </span>
        </label>

        {/* Affiliate disclosure — always visible */}
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          {AFFILIATE_DISCLOSURE}{' '}
          <a href="/disclosure" className="underline hover:text-navy">Full disclosure →</a>
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !notAdviceAck}
          className="w-full rounded-xl bg-gold py-4 text-base font-bold text-navy transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gold-dark"
        >
          {loading ? 'Redirecting to payment…' : `Pay ${details.price} — Get My Report`}
        </button>
        <p className="text-center text-xs text-slate-400">
          Secure checkout via Stripe · PDF delivered to email · One-time payment, no subscription
        </p>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <a href="/" className="font-serif text-xl font-bold text-navy">
            Lifetime<span className="text-gold">SS</span>
          </a>
          <button
            type="button"
            onClick={() => router.push('/assessment/results')}
            className="text-xs text-slate-500 underline hover:text-navy"
          >
            ← Back to results
          </button>
        </div>

        <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Get Your Blueprint</h1>

        <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
          <CheckoutForm />
        </Suspense>
      </div>
    </main>
  );
}

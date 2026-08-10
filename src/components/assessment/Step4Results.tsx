'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, Info, ShieldX, Globe } from 'lucide-react';
import { useAssessmentStore } from '@/store/assessmentStore';
import { formatCurrency } from '@/lib/scoring-engine';
import TrustBox from '@/components/ui/TrustBox';
import type { CountryScore } from '@/types/assessment';

const VISA_SOURCES = [
  { title: 'Portugal D7 Visa — SEF Income Requirements 2026', url: 'https://vistos.mj.pt', dateVerified: '2026-01-15' },
  { title: 'Spain Non-Lucrative Visa — Spanish Consulate Guidelines', url: 'https://www.exteriores.gob.es', dateVerified: '2026-01-15' },
  { title: 'Panama Pensionado — Ministerio de Comercio e Industrias', url: 'https://mici.gob.pa', dateVerified: '2026-01-15' },
  { title: 'Mexico Temporary Resident — Instituto Nacional de Migración', url: 'https://www.gob.mx/inm', dateVerified: '2026-01-15' },
  { title: 'Thailand Retirement Visa — Royal Thai Embassy', url: 'https://www.thaiembassy.com', dateVerified: '2026-01-15' },
  { title: 'Malaysia MM2H Silver Program 2024 Revision', url: 'https://mm2h.gov.my', dateVerified: '2026-01-15' },
  { title: 'Costa Rica Pensionado Visa — CAJA Requirements', url: 'https://www.mrree.go.cr', dateVerified: '2026-01-15' },
  { title: 'Italy Elective Residency Visa — Ministero degli Affari Esteri', url: 'https://vistoperitalia.esteri.it', dateVerified: '2026-01-15' },
  { title: 'Colombia Pensioner Visa — Ministerio de Relaciones Exteriores', url: 'https://www.cancilleria.gov.co', dateVerified: '2026-01-15' },
];

const PERSISTENT_DISCLAIMER =
  'Educational planning estimates based on 2026 rules and simplified assumptions. Not financial, tax, or legal advice. Verify with a licensed professional.';
function AccessLevelBadge({ accessLevel }: Pick<CountryScore, 'accessLevel'>) {
  if (accessLevel !== 'resident-by-passport') return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800">
      <Globe size={12} /> Resident by Passport — No Visa Needed
    </span>
  );
}
function QualificationBadge({ qualificationStatus, visaIncomeMin, visaSavingsAlt }: Pick<CountryScore, 'qualificationStatus' | 'visaIncomeMin' | 'visaSavingsAlt'>) {
  if (qualificationStatus === 'income') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
        <CheckCircle size={12} /> Income route qualifies
      </span>
    );
  }
  if (qualificationStatus === 'savings') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
        <AlertTriangle size={12} /> Savings route ({formatCurrency(visaSavingsAlt ?? 0)})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
      <XCircle size={12} /> Needs {formatCurrency(visaIncomeMin)}/mo income
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-emerald-600' :
    score >= 55 ? 'bg-blue-600' :
    score >= 35 ? 'bg-amber-600' : 'bg-red-500';
  return (
    <div className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl ${color} text-white shadow`}>
      <span className="text-lg font-bold leading-none">{score}</span>
      <span className="text-[9px] font-medium opacity-80">/100</span>
    </div>
  );
}

function FailedMustHavesTags({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
        >
          <ShieldX size={11} />
          {label}
        </span>
      ))}
    </div>
  );
}

function CountryCard({ country, rank }: { country: CountryScore; rank: number }) {
  const [expanded, setExpanded] = useState(rank <= 3);
  const midBudget = (country.budgetLow + country.budgetHigh) / 2;
  const budgetCover = country.surplus >= 0 ? 'surplus' : 'shortfall';
  const hasMustHaveFail = country.failedMustHaves.length > 0;

  return (
    <div className={`rounded-2xl border-2 bg-white shadow-sm transition-all ${
      hasMustHaveFail
        ? 'border-red-200 opacity-80'
        : rank === 1 ? 'border-gold' : rank <= 3 ? 'border-slate-200 ring-1 ring-slate-100' : 'border-slate-100'
    }`}>
      {rank === 1 && !hasMustHaveFail && (
        <div className="rounded-t-xl bg-gold px-4 py-1.5 text-center text-xs font-bold text-navy">
          ⭐ Best Match for Your Profile
        </div>
      )}
      {hasMustHaveFail && (
        <div className="rounded-t-xl bg-red-50 px-4 py-1.5 text-center text-xs font-semibold text-red-700">
          Excluded from top 3 — fails your non-negotiables
        </div>
      )}
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{country.flag}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-navy">{country.name}</h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">#{rank}</span>
              </div>
              <p className="text-xs text-slate-500">{country.visaName}</p>
            </div>
          </div>
          <ScoreBadge score={country.score} />
        </div>

        {/* Qualification + budget row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <QualificationBadge
            qualificationStatus={country.qualificationStatus}
            visaIncomeMin={country.visaIncomeMin}
            visaSavingsAlt={country.visaSavingsAlt}
          />
          <AccessLevelBadge accessLevel={country.accessLevel} />
          <span className={`text-xs font-medium ${budgetCover === 'surplus' ? 'text-emerald-700' : 'text-amber-700'}`}>
            {budgetCover === 'surplus'
              ? `+${formatCurrency(country.surplus)}/mo surplus`
              : `${formatCurrency(Math.abs(country.surplus))}/mo below comfortable`}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
            🌬 {country.airQualityBand}
          </span>
        </div>

        {/* Top strengths */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {country.topStrengths.map((s) => (
            <span key={s} className="rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-navy">
              {s}
            </span>
          ))}
        </div>

        {/* Failed must-have tags */}
        <FailedMustHavesTags labels={country.failedMustHaves} />

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 flex w-full items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium text-navy hover:bg-slate-100"
        >
          <span>{expanded ? 'Less detail' : 'More detail'}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 text-sm">
            {/* Visa details */}
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-navy">Visa Requirements</p>
              <p className="text-slate-600">{country.visaRequirementsNote}</p>
            </div>

            {/* Tax posture */}
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-navy">Tax Treatment</p>
              <p className="text-slate-600">{country.taxNote}</p>
            </div>

            {/* Healthcare */}
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-navy">Healthcare</p>
              <p className="text-slate-600">{country.healthcareNote}</p>
            </div>

            {/* Budget breakdown */}
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-navy">Budget Range (Couple)</p>
              <p className="text-slate-600">
                {formatCurrency(country.budgetLow)} – {formatCurrency(country.budgetHigh)} / month comfortable lifestyle
              </p>
            </div>

            {/* Honest reality */}
            <div className="flex gap-2 rounded-lg bg-amber-50 p-3">
              <Info size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="mb-0.5 text-xs font-bold text-amber-800">Honest Reality Check</p>
                <p className="text-xs leading-relaxed text-amber-900">{country.honestReality}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmailCaptureForm() {
  const { email, setEmail, emailConsent, setEmailConsent, results, step1 } = useAssessmentStore();
  const [localEmail, setLocalEmail] = useState(email);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailConsent) return;
    setLoading(true);
    setError('');
    try {
      const topMatches = results.slice(0, 3).map((r) => ({
        name: r.name,
        score: r.score,
        surplus: r.surplus,
        budgetLow: r.budgetLow,
        budgetHigh: r.budgetHigh,
      }));
      const res = await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: localEmail,
          emailConsent,
          topMatches,
          totalMonthlyIncome: step1.totalMonthlyIncome,
        }),
      });
      if (res.ok) {
        setEmail(localEmail);
        setSubmitted(true);
      } else {
        setError('Could not save. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle size={16} /> Summary sent \u2014 check your inbox shortly.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-semibold text-navy">Email your free summary</label>
        <input
          type="email"
          required
          value={localEmail}
          onChange={(e) => setLocalEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={emailConsent}
          onChange={(e) => setEmailConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-gold"
        />
        <span className="text-xs leading-relaxed text-slate-600">
          Email me my summary. I understand RetireEngine provides educational estimates, not financial, tax, or legal advice, and I can unsubscribe anytime.
        </span>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!emailConsent || loading || !localEmail}
        className="w-full rounded-lg bg-gold py-2.5 text-sm font-bold text-navy transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gold-dark"
      >
        {loading ? 'Sending\u2026' : 'Email My Summary (Free)'}
      </button>
    </form>
  );
}

export default function Step4Results() {
  const { results, step1, step2 } = useAssessmentStore();

  const topMatch = results[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-navy p-6 text-white">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">
          Your Personalized Country Matches
        </p>
        <h2 className="mb-2 font-serif text-2xl font-bold">
          {results.length} Countries Ranked for Your Profile
        </h2>
        <div className="flex flex-wrap gap-4 text-sm text-cream/80">
          <span>Income: <strong className="text-cream">{formatCurrency(step1.totalMonthlyIncome)}/mo</strong></span>
          <span>Liquid assets: <strong className="text-cream">{formatCurrency(step1.liquidAssets)}</strong></span>
          <span>Planning horizon: <strong className="text-cream">{Math.round(step2.adjustedRemainingYears)} years</strong></span>
        </div>
      </div>

      {/* Persistent disclaimer — required on all result surfaces */}
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
        {PERSISTENT_DISCLAIMER}
      </div>

      {/* Visa income context note */}
      {results.some((r) => r.qualificationStatus === 'deficit') && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Some countries require higher income to qualify via the standard income route.</p>
            <p className="mt-0.5 text-amber-800">
              Countries marked in red applied a -25 point visa penalty. Consider the savings-route
              alternative or countries with lower thresholds. The full report includes a visa strategy for each.
            </p>
          </div>
        </div>
      )}

      {/* Country cards */}
      <div className="space-y-4">
        {results.map((country, i) => (
          <CountryCard key={country.countryKey} country={country} rank={i + 1} />
        ))}
      </div>

      {/* Free email capture */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-1 font-serif text-lg font-bold text-navy">Save Your Results</h3>
        <p className="mb-4 text-sm text-slate-500">Get a free summary of your top matches and scores.</p>
        <EmailCaptureForm />
      </div>

      {/* Purchase CTAs */}
      {topMatch && (
        <div className="rounded-2xl border-2 border-gold bg-cream p-6">
          <h3 className="mb-1 font-serif text-xl font-bold text-navy">
            Get Your Full Retirement Abroad Blueprint
          </h3>
          <p className="mb-5 text-sm text-slate-600">
            Detailed visa walkthroughs, US expat tax analysis, Medicare alternatives, and a
            step-by-step action plan — customized to your score and top matches.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/assessment/checkout?tier=standard"
              className="block rounded-xl border-2 border-navy bg-white p-4 text-center transition-transform hover:-translate-y-0.5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Standard Report</p>
              <p className="my-1 font-serif text-3xl font-bold text-navy">$9</p>
              <p className="text-xs text-slate-500">8 pages · Top 3 deep dives · Action checklist</p>
              <span className="mt-3 inline-block rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">
                Get Standard →
              </span>
            </Link>
            <Link
              href="/assessment/checkout?tier=premium"
              className="relative block rounded-xl border-2 border-gold bg-navy p-4 text-center transition-transform hover:-translate-y-0.5"
            >
              <p className="absolute right-3 top-3 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy">
                MOST POPULAR
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold/70">Premium Report</p>
              <p className="my-1 font-serif text-3xl font-bold text-gold">$19</p>
              <p className="text-xs text-cream/70">11 pages · Tax framework · Medicare roadmap · 90-day plan</p>
              <span className="mt-3 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy">
                Get Premium →
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Trust box */}
      <TrustBox
        sources={VISA_SOURCES}
        citationTitle="RetireEngine — Vitality Window Retirement Abroad Assessment"
        citationUrl="https://retireengine.com/assessment"
        rulesYear={2026}
      />
    </div>
  );
}

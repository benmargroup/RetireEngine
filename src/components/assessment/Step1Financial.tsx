'use client';

import { useState } from 'react'
import { useSliderTickPositions } from '@/lib/useSliderTickPositions';
import { SSA_BENEFIT_FACTOR, CLAIMING_AGES, type ClaimingAge } from '@/lib/ss-engine';
import { useAssessmentStore } from '@/store/assessmentStore';
import type { PassportProfile } from '@/types/assessment';

const CLAIMING_AGE_META: Record<ClaimingAge, { label: string; sub: string; color: string }> = {
  62: { label: 'Age 62', sub: 'Early (70% of FRA)', color: 'text-amber-600' },
  65: { label: 'Age 65', sub: '86.7% of FRA', color: 'text-blue-600' },
  67: { label: 'Age 67', sub: 'Full Retirement Age', color: 'text-emerald-600' },
  70: { label: 'Age 70', sub: 'Maximum (124% of FRA)', color: 'text-gold-dark' },
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function NumberInput({
  label,
  hint,
  value,
  onChange,
  prefix = '$',
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-base font-semibold text-navy">{label}</label>
      {hint && <p className="mb-1.5 text-base text-slate-500">{hint}</p>}
      <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-gold focus-within:ring-1 focus-within:ring-gold">
        <span className="px-3 text-base text-slate-500">{prefix}</span>
        <input
          type="number"
          min={0}
          value={value || ''}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          placeholder="0"
          className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-base text-navy outline-none placeholder:text-slate-300"
        />
      </div>
    </div>
  );
}

const WITHDRAWAL_RATE_LABELS: Record<number, string> = {
  3: '3% — very conservative; suitable for 35+ year horizons.',
  4: '4% — conservative benchmark.',
  5: '5% — aggressive; higher risk if markets fall early.',
};

function withdrawalLabel(rate: number): string {
  const pct = Math.round(rate * 100);
  return WITHDRAWAL_RATE_LABELS[pct] ?? `${pct}%`;
}

function PassportBlock({
  profile,
  onChange,
}: {
  profile: PassportProfile;
  onChange: (updated: PassportProfile) => void;
}) {
  const PASSPORT_OPTIONS: { value: string; label: string }[] = [
    { value: 'us', label: 'United States' },
    { value: 'eu-eea', label: 'EU / EEA' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' },
    { value: 'nz', label: 'New Zealand' },
  ];

  function togglePassport(value: string) {
    const has = profile.passports.includes(value);
    const passports = has
      ? profile.passports.filter((p) => p !== value)
      : [...profile.passports, value];
    onChange({ ...profile, passports });
  }

  function updateDescent(text: string) {
    const descentEligible = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...profile, descentEligible });
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <p className="text-base font-semibold text-navy">Passports / Citizenship</p>
        <p className="text-base text-slate-500">
          Select every passport you hold. Some passports grant automatic residency rights in certain countries — no visa required.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PASSPORT_OPTIONS.map(({ value, label }) => {
            const active = profile.passports.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => togglePassport(value)}
                className={`rounded-full border-2 px-4 py-2 text-base font-medium transition-all ${
                  active ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-base text-slate-600">
        <input
          type="checkbox"
          checked={profile.hasOCI}
          onChange={(e) => onChange({ ...profile, hasOCI: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300"
        />
        OCI (Overseas Citizen of India) card holder
      </label>

      <div>
        <p className="text-base font-semibold text-navy">Citizenship by Descent (optional)</p>
        <p className="text-base text-slate-500">
          Informational only — does not affect your scores. List any countries where you may be eligible through a parent or grandparent, separated by commas.
        </p>
        <input
          type="text"
          defaultValue={(profile.descentEligible ?? []).join(', ')}
          onBlur={(e) => updateDescent(e.target.value)}
          placeholder="e.g. Ireland, Italy"
          className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2 text-base"
        />
      </div>
    </div>
  );
}

export default function Step1Financial({ intent }: { intent?: string }) {
  const { step1, setStep1, setStep, passportProfile, setPassportProfile, reset } = useAssessmentStore();
  const { inputRef: withdrawalSliderRef, values: withdrawalTickValues, positions: withdrawalTickPositions } = useSliderTickPositions(3, 5);

  const INTENT_HEADERS: Record<string, { title: string; subtitle: string }> = {
    location_fit: {
      title: 'Find Your Best Global Destination Match',
      subtitle: 'To match you with destinations that fit your lifestyle and official visa income thresholds, summarize your monthly income streams below.',
    },
    ss_timing: {
      title: 'Model Your Social Security Claiming Strategy',
      subtitle: 'To calculate your optimal claiming age and break-even timeline, enter your estimated FRA benefit and income streams below.',
    },
    nest_egg: {
      title: 'Calculate Your Safe Retirement Spending Power',
      subtitle: 'To measure your monthly retirement baseline and portfolio solvency, summarize your income and liquid assets below.',
    },
  };
  const headerContent = intent ? INTENT_HEADERS[intent] : undefined;

  const [fraBenefit, setFraBenefit] = useState(step1.fraBenefit);
  const [selectedAge, setSelectedAge] = useState<ClaimingAge>(step1.selectedClaimingAge);
  const [pension, setPension] = useState(step1.pension);
  const [dividendIncome, setDividendIncome] = useState(step1.dividendIncome);
  const [rentalIncome, setRentalIncome] = useState(step1.rentalIncome);
  const [otherIncome, setOtherIncome] = useState(step1.otherIncome);
  const [liquidAssets, setLiquidAssets] = useState(step1.liquidAssets);
  // Withdrawal rate: slider stored as integer percentage (3–5); default 4
  const [withdrawalRatePct, setWithdrawalRatePct] = useState(Math.round((step1.withdrawalRate || 0.04) * 100));

  // Captured once at mount — reflects whether real prior data existed when the
  // page loaded, independent of edits made during this session.
  const [hadSavedData] = useState(
    () =>
      step1.fraBenefit > 0 ||
      step1.pension > 0 ||
      step1.dividendIncome > 0 ||
      step1.rentalIncome > 0 ||
      step1.otherIncome > 0 ||
      step1.liquidAssets > 0
  );
  const [showWelcomeBack, setShowWelcomeBack] = useState(hadSavedData);

  function handleStartFresh() {
    setFraBenefit(0);
    setSelectedAge(67);
    setPension(0);
    setDividendIncome(0);
    setRentalIncome(0);
    setOtherIncome(0);
    setLiquidAssets(0);
    setWithdrawalRatePct(4);
    reset();
    setShowWelcomeBack(false);
  }

  const withdrawalRate = withdrawalRatePct / 100;
  const portfolioMonthlyIncome = Math.floor((liquidAssets * withdrawalRate) / 12);
  const ssMonthlyBenefit = Math.floor(fraBenefit * SSA_BENEFIT_FACTOR[selectedAge]);
  const totalMonthlyIncome = ssMonthlyBenefit + pension + dividendIncome + rentalIncome + otherIncome + portfolioMonthlyIncome;

  function handleNext() {
    setStep1({
      fraBenefit,
      selectedClaimingAge: selectedAge,
      ssMonthlyBenefit,
      pension,
      dividendIncome,
      rentalIncome,
      otherIncome,
      liquidAssets,
      withdrawalRate,
      portfolioMonthlyIncome,
      totalMonthlyIncome,
    });
    setStep(2);
  }

  const canContinue = fraBenefit > 0 || pension > 0 || dividendIncome > 0 || rentalIncome > 0 || otherIncome > 0 || liquidAssets > 0;

  return (
    <div className="space-y-8">
      {/* Deliverable promise banner */}
      <div className="rounded-xl bg-navy p-5 text-white shadow-md">
        <p className="mb-3 text-base font-semibold uppercase tracking-wider text-gold">
          Your Custom Assessment Report Includes
        </p>
        <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-3 text-base sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-forest-light">✓</span>
            <span>Social Security Claiming Strategy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-forest-light">✓</span>
            <span>Visa Solvency &amp; Income Deficit Check</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-forest-light">✓</span>
            <span>Top Ranked Global Destination Matches</span>
          </div>
        </div>
      </div>

      {showWelcomeBack && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-base font-semibold text-navy">Welcome back!</p>
            <p className="text-base text-slate-600">
              We restored your saved financial profile
              {fraBenefit > 0 && ` — $${fraBenefit.toLocaleString()} FRA benefit`}
              {liquidAssets > 0 && `, $${liquidAssets.toLocaleString()} in assets`}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartFresh}
            className="shrink-0 rounded-lg border-2 border-navy px-4 py-2 text-base font-semibold text-navy transition hover:bg-navy hover:text-white"
          >
            Start Fresh
          </button>
        </div>
      )}

      <div>
        <h2 className="mb-1 font-serif text-2xl font-bold text-navy">
          {headerContent?.title ?? 'Your Financial Picture'}
        </h2>
        <p className="text-base text-slate-600">
          {headerContent?.subtitle ?? "Tell us about your income streams. We'll calculate your total monthly retirement income and compare it to visa qualification thresholds for 10 countries."}
        </p>
      </div>

      {/* SS FRA benefit */}
      <div className="rounded-xl border border-gold/30 bg-cream p-5">
        <h3 className="mb-3 text-base font-bold uppercase tracking-wide text-navy">
          Social Security Claiming Strategy
        </h3>
        <NumberInput
          label="Your monthly benefit at Full Retirement Age (67)"
          hint="Find this at ssa.gov/myaccount — look for your 'FRA benefit' on the statement."
          value={fraBenefit}
          onChange={setFraBenefit}
        />

        {fraBenefit > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-base font-semibold text-navy">When will you claim?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CLAIMING_AGES.map((age) => {
                const benefit = Math.floor(fraBenefit * SSA_BENEFIT_FACTOR[age]);
                const meta = CLAIMING_AGE_META[age];
                const isSelected = age === selectedAge;
                return (
                  <button
                    key={age}
                    type="button"
                    onClick={() => setSelectedAge(age)}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      isSelected
                        ? 'border-gold bg-navy text-white'
                        : 'border-slate-200 bg-white hover:border-gold/50'
                    }`}
                  >
                    <span className={`block text-base font-medium ${isSelected ? 'text-gold' : 'text-slate-500'}`}>
                      {meta.sub}
                    </span>
                    <span className={`block text-base font-bold ${isSelected ? 'text-white' : 'text-navy'}`}>
                      {meta.label}
                    </span>
                    <span className={`block text-base font-semibold ${isSelected ? 'text-gold-light' : meta.color}`}>
                      {fmt(benefit)}/mo
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedAge > 0 && (
              <p className="mt-2 text-base text-slate-500">
                At age {selectedAge}: <strong>{fmt(ssMonthlyBenefit)}/month</strong> |{' '}
                {fmt(ssMonthlyBenefit * 12)}/year
              </p>
            )}
          </div>
        )}
      </div>

      {/* Other income */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-base font-bold uppercase tracking-wide text-navy">
          Other Monthly Income Streams
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput label="Pension / Annuity" value={pension} onChange={setPension} />
          <NumberInput label="Dividend & Investment Income" value={dividendIncome} onChange={setDividendIncome} />
          <NumberInput label="Rental Income" value={rentalIncome} onChange={setRentalIncome} />
          <NumberInput label="Other Passive Income" value={otherIncome} onChange={setOtherIncome} />
        </div>
      </div>

      {/* Liquid assets + withdrawal rate */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <h3 className="text-base font-bold uppercase tracking-wide text-navy">
          Portfolio & Liquid Assets
        </h3>

        <NumberInput
          label="Total liquid / investable assets"
          hint="Savings, brokerage, and easily liquidated assets. Used to check savings-route visa qualifications and to calculate portfolio income below."
          value={liquidAssets}
          onChange={setLiquidAssets}
        />

        {/* Withdrawal rate slider */}
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-base font-semibold text-navy">
              Portfolio withdrawal rate
            </label>
            <span className="text-base font-bold text-gold">{withdrawalRatePct}%</span>
          </div>
          <input
            ref={withdrawalSliderRef}
            type="range"
            min={3}
            max={5}
            step={1}
            value={withdrawalRatePct}
            onChange={(e) => setWithdrawalRatePct(Number(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-gold [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-gold [&::-moz-range-thumb]:shadow-md"
          />
          <div className="relative mt-1 h-5 text-base text-slate-400">
            {withdrawalTickValues.map((v, i) => (
              <span key={v} className="absolute -translate-x-1/2" style={{ left: `${withdrawalTickPositions[i]}px` }}>
                {v}%
              </span>
            ))}
          </div>
          <p className="mt-2 text-base text-slate-500">{withdrawalLabel(withdrawalRate)}</p>
          {liquidAssets > 0 && (
            <p className="mt-1 text-base text-slate-600">
              At {withdrawalRatePct}%, your portfolio generates{' '}
              <strong className="text-navy">{fmt(portfolioMonthlyIncome)}/month</strong>
            </p>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="rounded-xl bg-navy px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-cream/80">Total Monthly Income</span>
          <span className="font-serif text-2xl font-bold text-gold">{fmt(totalMonthlyIncome)}</span>
        </div>
        {portfolioMonthlyIncome > 0 && (
          <p className="mt-1 text-base text-cream/50">
            Includes {fmt(portfolioMonthlyIncome)}/mo portfolio withdrawal at {withdrawalRatePct}%
          </p>
        )}
      </div>

      <PassportBlock profile={passportProfile} onChange={setPassportProfile} />

      <button
        type="button"
        onClick={handleNext}
        disabled={!canContinue}
        className="w-full rounded-xl bg-gold py-3.5 text-base font-bold text-navy transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gold-dark"
      >
        Continue to Longevity Profile →
      </button>
    </div>
  );
}

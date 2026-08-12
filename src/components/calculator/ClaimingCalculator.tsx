'use client';

/**
 * ClaimingCalculator.tsx
 * -------------------------------------------------------------------------
 * RetireEngine — the interactive claiming + geo-arbitrage calculator.
 *
 * Reactive, accessible, mobile-first. All math is client-side and pure
 * (actuarial-engine + ss-engine); this component only collects inputs and
 * renders results. It recomputes on every input change via useMemo.
 *
 * Styling: Tailwind CSS utility classes only. Icons: lucide-react.
 * Charting: lightweight inline bars (no chart dependency), keeping it zero-bloat.
 *
 * Results are educational planning estimates, not financial advice.
 * -------------------------------------------------------------------------
 */

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Heart,
  DollarSign,
  MapPin,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Mail,
  Briefcase,
  FileText,
  Info,
  Check,
} from 'lucide-react';

import {
  estimateLongevity,
  type Sex,
  type SmokingStatus,
  type HealthStatus,
  type LongevityOutput,
} from '../../lib/actuarial-engine';

import {
  calculateSSResults,
  getLocation,
  LOCATIONS,
  type SSEngineResults,
  type LocationData,
  type ClaimingAge,
} from '../../lib/ss-engine';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

/** Investable-asset bands. `highAsset` gates the fiduciary CTA (> $500k). */
interface AssetBand {
  id: string;
  label: string;
  /** Representative midpoint used for portfolio math. */
  midpoint: number;
  highAsset: boolean;
}

/** Payload passed to the host app when a visitor submits the email form. */
export interface LeadCapturePayload {
  email: string;
  consent: boolean;
  recommendedClaimingAge: ClaimingAge;
  medianAge: number;
  locationLabel: string;
}

/** Optional integration hooks. Sensible no-ops by default. */
export interface ClaimingCalculatorProps {
  onEmailCapture?: (payload: LeadCapturePayload) => void;
  onFiduciaryClick?: () => void;
  onExpatCpaClick?: () => void;
  /** Which location to preselect. Defaults to the first in LOCATIONS. */
  defaultLocationId?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const ASSET_BANDS: readonly AssetBand[] = [
  { id: 'under-250k', label: 'Under $250k', midpoint: 125000, highAsset: false },
  { id: '250-500k', label: '$250k–$500k', midpoint: 375000, highAsset: false },
  { id: '500k-1m', label: '$500k–$1M', midpoint: 750000, highAsset: true },
  { id: 'over-1m', label: 'Over $1M', midpoint: 1_500_000, highAsset: true },
];

const SEX_OPTIONS: ReadonlyArray<{ value: Sex; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

const HEALTH_OPTIONS: ReadonlyArray<{ value: HealthStatus; label: string }> = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const SMOKING_OPTIONS: ReadonlyArray<{ value: SmokingStatus; label: string }> = [
  { value: 'never', label: 'Never' },
  { value: 'former', label: 'Former' },
  { value: 'current', label: 'Current' },
];

/* Medicare Part B standard premium, 2026. */
const PART_B_PREMIUM_2026 = 202.9;

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** Parse a text input to a finite number, or undefined if blank/invalid. */
function toOptionalNumber(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/* ------------------------------------------------------------------ */
/* Small presentational building blocks                               */
/* ------------------------------------------------------------------ */

/** A titled input card. */
function Card(props: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-700">
        <span className="text-teal-700">{props.icon}</span>
        {props.title}
      </h3>
      {props.children}
    </section>
  );
}

/** A labelled field wrapper. */
function Field(props: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <label htmlFor={props.htmlFor} className="mb-1.5 block text-base font-medium text-slate-700">
        {props.label}
      </label>
      {props.children}
      {props.hint ? <p className="mt-1 text-base text-slate-500">{props.hint}</p> : null}
    </div>
  );
}

/** Accessible segmented radio group (fieldset/legend + buttons). */
function SegmentedGroup<T extends string>(props: {
  legend: string;
  name: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mb-4 last:mb-0">
      <legend className="mb-1.5 text-base font-medium text-slate-700">{props.legend}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={props.legend}>
        {props.options.map((opt) => {
          const selected = opt.value === props.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => props.onChange(opt.value)}
              className={[
                'rounded-lg border px-3 py-2 text-base font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1',
                selected
                  ? 'border-teal-700 bg-teal-700 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 ' +
  'focus:border-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600';

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ClaimingCalculator(props: ClaimingCalculatorProps) {
  const { onEmailCapture, onFiduciaryClick, onExpatCpaClick, defaultLocationId } = props;

  /* -------------------- Input state -------------------- */
  const [age, setAge] = useState<number>(63);
  const [sex, setSex] = useState<Sex>('female');
  const [health, setHealth] = useState<HealthStatus>('good');
  const [smoking, setSmoking] = useState<SmokingStatus>('never');
  const [motherAge, setMotherAge] = useState<string>('');
  const [fatherAge, setFatherAge] = useState<string>('');

  const [fraBenefit, setFraBenefit] = useState<number>(2450);
  const [assetBandId, setAssetBandId] = useState<string>(ASSET_BANDS[0].id);

  const [locationId, setLocationId] = useState<string>(defaultLocationId ?? LOCATIONS[0].id);

  /* -------------------- Email form state -------------------- */
  const [email, setEmail] = useState<string>('');
  const [consent, setConsent] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);

  /* -------------------- Derived, reactive results -------------------- */
  const assetBand = useMemo(
    () => ASSET_BANDS.find((b) => b.id === assetBandId) ?? ASSET_BANDS[0],
    [assetBandId],
  );

  const location = useMemo(() => getLocation(locationId) ?? LOCATIONS[0], [locationId]);

  const longevity: LongevityOutput = useMemo(
    () =>
      estimateLongevity({
        age,
        sex,
        smoking,
        health,
        motherAgeAtDeath: toOptionalNumber(motherAge),
        fatherAgeAtDeath: toOptionalNumber(fatherAge),
      }),
    [age, sex, smoking, health, motherAge, fatherAge],
  );

  const results: SSEngineResults | null = useMemo(() => {
    if (!(fraBenefit > 0)) return null;
    return calculateSSResults({
      fraBenefit,
      currentAge: age,
      medianLifespan: longevity.medianAge,
      investableAssets: assetBand.midpoint,
      targetLocation: location,
    });
  }, [fraBenefit, age, longevity.medianAge, assetBand.midpoint, location]);

  /* -------------------- Handlers -------------------- */
  function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (!results || !consent || email.trim() === '') return;
    onEmailCapture?.({
      email: email.trim(),
      consent,
      recommendedClaimingAge: results.recommendedClaimingAge,
      medianAge: longevity.medianAge,
      locationLabel: location.label,
    });
    setEmailSent(true);
  }

  /* -------------------- Persona-aware context -------------------- */
  const isExpat = location.kind === 'expat';
  const pre65 = age < 65;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Your Social Security claiming &amp; location plan
        </h2>
        <p className="mt-1 text-base text-slate-600">
          See your true lifetime benefit across ages 62, 65, 67, and 70 — adjusted for your
          longevity and where you plan to live.
        </p>
      </header>

      {/* ---------------- Inputs ---------------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card 1: Longevity */}
        <Card icon={<Heart size={16} />} title="About you">
          <Field label="Current age" htmlFor="age">
            <input
              id="age"
              type="number"
              min={50}
              max={80}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <SegmentedGroup legend="Sex" name="sex" value={sex} options={SEX_OPTIONS} onChange={setSex} />
          <SegmentedGroup
            legend="General health"
            name="health"
            value={health}
            options={HEALTH_OPTIONS}
            onChange={setHealth}
          />
          <SegmentedGroup
            legend="Smoking"
            name="smoking"
            value={smoking}
            options={SMOKING_OPTIONS}
            onChange={setSmoking}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mother's age*" htmlFor="motherAge" hint="At death, or now if living">
              <input
                id="motherAge"
                type="number"
                min={0}
                max={120}
                value={motherAge}
                onChange={(e) => setMotherAge(e.target.value)}
                className={inputClass}
                placeholder="—"
              />
            </Field>
            <Field label="Father's age*" htmlFor="fatherAge" hint="At death, or now if living">
              <input
                id="fatherAge"
                type="number"
                min={0}
                max={120}
                value={fatherAge}
                onChange={(e) => setFatherAge(e.target.value)}
                className={inputClass}
                placeholder="—"
              />
            </Field>
          </div>
        </Card>

        {/* Card 2: Benefit + assets */}
        <Card icon={<DollarSign size={16} />} title="Your Social Security">
          <Field
            label="Monthly benefit at full retirement age (67)"
            htmlFor="fraBenefit"
            hint="Find this on your SSA statement at ssa.gov"
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                $
              </span>
              <input
                id="fraBenefit"
                type="number"
                min={0}
                step={10}
                value={fraBenefit}
                onChange={(e) => setFraBenefit(Number(e.target.value))}
                className={inputClass + ' pl-7'}
              />
            </div>
          </Field>
          <Field label="Investable assets" htmlFor="assetBand" hint="Unlocks a tailored recommendation">
            <select
              id="assetBand"
              value={assetBandId}
              onChange={(e) => setAssetBandId(e.target.value)}
              className={inputClass}
            >
              {ASSET_BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
        </Card>

        {/* Card 3: Location */}
        <Card icon={<MapPin size={16} />} title="Where you'll live">
          <Field label="Target location" htmlFor="location">
            <select
              id="location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={inputClass}
            >
              <optgroup label="US states">
                {LOCATIONS.filter((l) => l.kind === 'us-state').map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Retire abroad">
                {LOCATIONS.filter((l) => l.kind === 'expat').map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          <dl className="mt-2 space-y-2 text-base">
            <div className="flex justify-between">
              <dt className="text-slate-500">Comfortable cost</dt>
              <dd className="font-medium text-slate-800">
                {usd0.format(location.monthlyComfortableCost)}/mo
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Tax</dt>
              <dd className="text-slate-700">{location.taxNote}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* ---------------- Results ---------------- */}
      {results ? (
        <div className="mt-8 space-y-6" aria-live="polite">
          {/* Longevity summary */}
          <LongevitySummary longevity={longevity} />

          {/* Benefits comparison */}
          <BenefitsComparison results={results} />

          {/* Strategic decision summary */}
          <DecisionSummary results={results} locationLabel={location.label} />

          {/* Visa qualification check (expat only) */}
          {isExpat ? <VisaCheck results={results} location={location} /> : null}

          {/* Tax & healthcare warnings */}
          <TaxHealthWarnings isExpat={isExpat} pre65={pre65} taxNote={location.taxNote} />

          {/* Segmented CTA */}
          <SegmentedCTA
            highAsset={assetBand.highAsset}
            isExpat={isExpat}
            email={email}
            consent={consent}
            emailSent={emailSent}
            onEmailChange={setEmail}
            onConsentChange={setConsent}
            onSubmit={handleEmailSubmit}
            onFiduciaryClick={onFiduciaryClick}
            onExpatCpaClick={onExpatCpaClick}
          />

          {/* Disclaimer */}
          <p className="rounded-lg bg-slate-50 p-4 text-base leading-relaxed text-slate-500">
            These figures are educational planning estimates based on 2026 SSA rules and simplified
            assumptions (nominal dollars, no COLA or discounting; longevity from an approximated
            period life table). They are not financial, tax, or legal advice. Confirm your numbers
            with a licensed professional before making any decision.
          </p>
        </div>
      ) : (
        <p className="mt-8 rounded-lg bg-amber-50 p-4 text-base text-amber-800">
          Enter your monthly benefit at full retirement age to see your plan.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Results sub-components                                              */
/* ------------------------------------------------------------------ */

function LongevitySummary({ longevity }: { longevity: LongevityOutput }) {
  const sign = longevity.adjustmentFactor >= 0 ? '+' : '';
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-700">
        <Heart size={16} className="text-teal-700" /> Your longevity estimate
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="75% chance to reach" value={`${longevity.p75Age}`} muted />
        <Stat label="Median age" value={`${longevity.medianAge}`} emphasis />
        <Stat label="25% chance to reach" value={`${longevity.p25Age}`} muted />
      </div>
      <p className="mt-3 text-base text-slate-500">
        Health, smoking, and family history adjust your baseline by{' '}
        <span className="font-medium text-slate-700">
          {sign}
          {longevity.adjustmentFactor}%
        </span>
        .
      </p>
    </section>
  );
}

function Stat({ label, value, emphasis, muted }: { label: string; value: string; emphasis?: boolean; muted?: boolean }) {
  return (
    <div className="text-center">
      <div
        className={[
          'font-bold',
          emphasis ? 'text-3xl text-teal-700' : 'text-2xl',
          muted ? 'text-slate-400' : 'text-slate-900',
        ].join(' ')}
      >
        {value}
      </div>
      <div className="mt-1 text-base text-slate-500">{label}</div>
    </div>
  );
}

function BenefitsComparison({ results }: { results: SSEngineResults }) {
  const maxLifetime = Math.max(...results.scenarios.map((s) => s.lifetimeTotal), 1);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-700">
        <TrendingUp size={16} className="text-teal-700" /> Lifetime benefits by claiming age
      </h3>

      {/* Inline bar chart (no chart dependency) */}
      <div className="space-y-3">
        {results.scenarios.map((s) => {
          const pct = Math.round((s.lifetimeTotal / maxLifetime) * 100);
          const isRec = s.claimingAge === results.recommendedClaimingAge;
          return (
            <div key={s.claimingAge}>
              <div className="mb-1 flex items-baseline justify-between text-base">
                <span className={isRec ? 'font-semibold text-teal-700' : 'text-slate-700'}>
                  Age {s.claimingAge}
                  {isRec ? ' · recommended' : ''}
                </span>
                <span className="tabular-nums font-medium text-slate-800">
                  {usd0.format(s.lifetimeTotal)}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={['h-full rounded-full', isRec ? 'bg-teal-600' : 'bg-slate-400'].join(' ')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison matrix */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-slate-200 text-base uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3 font-medium">Age</th>
              <th className="py-2 pr-3 font-medium">Monthly</th>
              <th className="py-2 pr-3 font-medium">Annual</th>
              <th className="py-2 pr-3 font-medium">Coverage</th>
              <th className="py-2 font-medium">Portfolio gap</th>
            </tr>
          </thead>
          <tbody>
            {results.scenarios.map((s) => {
              const isRec = s.claimingAge === results.recommendedClaimingAge;
              return (
                <tr
                  key={s.claimingAge}
                  className={['border-b border-slate-100', isRec ? 'bg-teal-50' : ''].join(' ')}
                >
                  <td className="py-2 pr-3 font-medium text-slate-800">{s.claimingAge}</td>
                  <td className="py-2 pr-3 tabular-nums">{usd0.format(s.monthlyBenefit)}</td>
                  <td className="py-2 pr-3 tabular-nums">{usd0.format(s.annualBenefit)}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {Math.round(s.coverageRatio * 100)}%
                  </td>
                  <td className="py-2 tabular-nums">
                    {s.requiredPortfolioGap > 0 ? usd0.format(s.requiredPortfolioGap) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-base text-slate-500">
        Coverage = annual benefit ÷ local comfortable cost. Portfolio gap = extra savings needed to
        close any shortfall (4% rule).
      </p>
    </section>
  );
}

function DecisionSummary({ results, locationLabel }: { results: SSEngineResults; locationLabel: string }) {
  const rec = results.recommendedScenario;
  const covers = rec.coverageRatio >= 1;
  return (
    <section className="rounded-2xl border-2 border-teal-600 bg-teal-50 p-5 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-teal-800">
        <ShieldCheck size={16} /> Recommended strategy
      </h3>
      <p className="text-lg font-semibold text-slate-900">
        Claim at {rec.claimingAge} and live in {locationLabel}.
      </p>
      <ul className="mt-3 space-y-1.5 text-base text-slate-700">
        <li>
          Monthly check: <span className="font-medium">{usd0.format(rec.monthlyBenefit)}</span>
        </li>
        <li>
          {covers ? (
            <>Your check covers the comfortable local budget — your portfolio can stay invested.</>
          ) : (
            <>
              Your check covers {Math.round(rec.coverageRatio * 100)}% of the local budget; about{' '}
              {usd0.format(rec.requiredPortfolioGap)} in savings closes the rest (4% rule).
            </>
          )}
        </li>
        <li>
          Break-even (claim 62 vs wait to 70):{' '}
          <span className="font-medium">age ~{Math.round(results.breakEvenAge62vs70)}</span>.
        </li>
      </ul>
      <p className="mt-3 text-base text-teal-800/80">
        This maximizes expected lifetime Social Security dollars at your median age. It does not weigh
        market risk, legacy goals, or spousal benefits — a fiduciary can factor those in.
      </p>
    </section>
  );
}

function VisaCheck({
  results,
  location,
}: {
  results: SSEngineResults;
  location: LocationData;
}) {
  const rec = results.recommendedScenario;
  const min = location.visaIncomeMinMonthly;
  if (min === undefined) return null;

  const meets = rec.monthlyBenefit >= min;

  return (
    <section
      className={[
        'rounded-2xl border p-5 shadow-sm',
        meets ? 'border-emerald-200 bg-emerald-50' : 'border-amber-300 bg-amber-50',
      ].join(' ')}
    >
      <h3 className="mb-2 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-700">
        {meets ? (
          <Check size={16} className="text-emerald-700" />
        ) : (
          <AlertTriangle size={16} className="text-amber-700" />
        )}
        Visa qualification check — {location.visaName}
      </h3>
      {meets ? (
        <p className="text-base text-slate-700">
          Your {usd0.format(rec.monthlyBenefit)}/mo check meets {location.label}&apos;s income route
          (min {usd0.format(min)}/mo). You qualify on income alone.
        </p>
      ) : (
        <p className="text-base text-slate-700">
          Your {usd0.format(rec.monthlyBenefit)}/mo check is <strong>below</strong> {location.label}
          &apos;s income route (min {usd0.format(min)}/mo).{' '}
          {location.visaSavingsAlt
            ? `You would instead qualify via the savings route (about ${usd0.format(
                location.visaSavingsAlt,
              )}).`
            : 'You would need another qualifying income source or the savings route.'}{' '}
          An expat tax pro can map the cleanest path.
        </p>
      )}
    </section>
  );
}

function TaxHealthWarnings({
  isExpat,
  pre65,
  taxNote,
}: {
  isExpat: boolean;
  pre65: boolean;
  taxNote: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-700">
        <Info size={16} className="text-teal-700" /> Tax &amp; healthcare notes
      </h3>
      <ul className="space-y-2 text-base text-slate-700">
        <li className="flex gap-2">
          <span className="mt-0.5 text-slate-400">•</span>
          <span>
            401(k)/IRA withdrawals are taxed at ordinary federal rates and raise your provisional
            income, so more of your Social Security can become taxable (up to 85%).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 text-slate-400">•</span>
          <span>{taxNote}</span>
        </li>
        {isExpat ? (
          pre65 ? (
            <li className="flex gap-2">
              <span className="mt-0.5 text-slate-400">•</span>
              <span>
                You&apos;re under 65, so you&apos;ll need private international health cover until
                Medicare eligibility at 65. Medicare does not cover care abroad.
              </span>
            </li>
          ) : (
            <li className="flex gap-2">
              <span className="mt-0.5 text-slate-400">•</span>
              <span>
                Medicare won&apos;t cover you abroad. Decide whether to keep Part B (
                {usd0.format(PART_B_PREMIUM_2026)}/mo) or drop it — dropping locks in a permanent 10%
                per-year penalty if you ever move back and re-enroll.
              </span>
            </li>
          )
        ) : (
          <li className="flex gap-2">
            <span className="mt-0.5 text-slate-400">•</span>
            <span>
              Medicare works normally here. Part B is {usd0.format(PART_B_PREMIUM_2026)}/mo in 2026;
              higher earners pay IRMAA surcharges.
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}

function SegmentedCTA(props: {
  highAsset: boolean;
  isExpat: boolean;
  email: string;
  consent: boolean;
  emailSent: boolean;
  onEmailChange: (v: string) => void;
  onConsentChange: (v: boolean) => void;
  onSubmit: (e: FormEvent) => void;
  onFiduciaryClick?: () => void;
  onExpatCpaClick?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold uppercase tracking-wide text-slate-700">
        Take the next step
      </h3>

      {/* Primary: email capture (everyone) */}
      {props.emailSent ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-base text-emerald-800">
          <Check size={18} /> Your 1-page summary is on its way to your inbox.
        </div>
      ) : (
        <form onSubmit={props.onSubmit} className="rounded-xl bg-slate-50 p-4">
          <label htmlFor="lead-email" className="mb-1.5 flex items-center gap-2 text-base font-medium text-slate-800">
            <Mail size={16} className="text-teal-700" /> Email me my free 1-page summary plan
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="lead-email"
              type="email"
              required
              value={props.email}
              onChange={(e) => props.onEmailChange(e.target.value)}
              placeholder="you@example.com"
              className={inputClass + ' flex-1'}
            />
            <button
              type="submit"
              disabled={!props.consent || props.email.trim() === ''}
              className={[
                'rounded-lg px-4 py-2 text-base font-semibold text-white transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1',
                !props.consent || props.email.trim() === ''
                  ? 'cursor-not-allowed bg-slate-300'
                  : 'bg-teal-700 hover:bg-teal-800',
              ].join(' ')}
            >
              Send my plan
            </button>
          </div>
          <label className="mt-3 flex items-start gap-2 text-base text-slate-600">
            <input
              type="checkbox"
              checked={props.consent}
              onChange={(e) => props.onConsentChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <span>
              I agree to receive my summary and occasional related emails, and — if I request it — to
              be matched with a vetted partner. Affiliate disclosure applies.
            </span>
          </label>
        </form>
      )}

      {/* Segmented secondary actions */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {props.highAsset ? (
          <button
            type="button"
            onClick={props.onFiduciaryClick}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-4 text-left transition-colors hover:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <Briefcase size={20} className="shrink-0 text-teal-700" />
            <span>
              <span className="block text-base font-semibold text-slate-900">
                Talk to a fee-only fiduciary
              </span>
              <span className="block text-base text-slate-500">
                A drawdown + claiming plan for your assets.
              </span>
            </span>
          </button>
        ) : null}

        {props.isExpat ? (
          <button
            type="button"
            onClick={props.onExpatCpaClick}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-4 text-left transition-colors hover:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <FileText size={20} className="shrink-0 text-teal-700" />
            <span>
              <span className="block text-base font-semibold text-slate-900">
                Consult an expat tax CPA
              </span>
              <span className="block text-base text-slate-500">
                Cross-border tax and residency, done right.
              </span>
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { estimateLongevity, MIN_AGE, MAX_AGE, type Sex, type SmokingStatus, type HealthStatus } from '@/lib/actuarial-engine';
import { useAssessmentStore } from '@/store/assessmentStore';

type RadioOption<T> = { value: T; label: string; description?: string };

const SEX_OPTIONS: RadioOption<Sex>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const SMOKING_OPTIONS: RadioOption<SmokingStatus>[] = [
  { value: 'never', label: 'Never smoked', description: '+5% longevity boost' },
  { value: 'former', label: 'Former smoker', description: 'Baseline' },
  { value: 'current', label: 'Current smoker', description: '-12% reduction' },
];

const HEALTH_OPTIONS: RadioOption<HealthStatus>[] = [
  { value: 'excellent', label: 'Excellent', description: '+10%' },
  { value: 'good', label: 'Good', description: 'Baseline' },
  { value: 'fair', label: 'Fair', description: '-10%' },
  { value: 'poor', label: 'Poor', description: '-20%' },
];

function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-base font-semibold text-navy">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border-2 px-4 py-2 text-base transition-all ${
              value === opt.value
                ? 'border-gold bg-navy text-white'
                : 'border-slate-200 bg-white text-navy hover:border-gold/50'
            }`}
          >
            <span className="font-semibold">{opt.label}</span>
            {opt.description && (
              <span className={`ml-1.5 text-base ${value === opt.value ? 'text-gold/80' : 'text-slate-400'}`}>
                {opt.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Step2Longevity() {
  const { step2, setStep2, setStep } = useAssessmentStore();

  const [age, setAge] = useState(step2.age || 65);
  const [sex, setSex] = useState<Sex>(step2.sex || 'male');
  const [smoking, setSmoking] = useState<SmokingStatus>(step2.smoking || 'never');
  const [health, setHealth] = useState<HealthStatus>(step2.health || 'good');
  const [motherAge, setMotherAge] = useState<string>(
    step2.motherAgeAtDeath != null ? String(step2.motherAgeAtDeath) : '',
  );
  const [fatherAge, setFatherAge] = useState<string>(
    step2.fatherAgeAtDeath != null ? String(step2.fatherAgeAtDeath) : '',
  );

  const estimate = estimateLongevity({
    age,
    sex,
    smoking,
    health,
    motherAgeAtDeath: motherAge !== '' ? Number(motherAge) : undefined,
    fatherAgeAtDeath: fatherAge !== '' ? Number(fatherAge) : undefined,
  });

  // Vitality Window: current age → p75 (upper quartile = active peak)
  // Planning horizon from current age → median
  const vitalityWindowEnd = estimate.p75Age;
  const vitalityWindowYears = Math.max(0, vitalityWindowEnd - age);
  const planningHorizonYears = Math.round(estimate.adjustedRemainingYears);

  function handleNext() {
    setStep2({
      age,
      sex,
      smoking,
      health,
      motherAgeAtDeath: motherAge !== '' ? Number(motherAge) : undefined,
      fatherAgeAtDeath: fatherAge !== '' ? Number(fatherAge) : undefined,
      medianAge: estimate.medianAge,
      p75Age: estimate.p75Age,
      p25Age: estimate.p25Age,
      adjustedRemainingYears: estimate.adjustedRemainingYears,
    });
    setStep(3);
  }

  // Timeline bar: current age → p75 → median → p25
  const minDisplay = age;
  const maxDisplay = estimate.p25Age + 2;
  const span = maxDisplay - minDisplay;

  function pct(a: number) {
    return Math.min(100, Math.max(0, ((a - minDisplay) / span) * 100));
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 font-serif text-2xl font-bold text-navy">Your Longevity Profile</h2>
        <p className="text-base text-slate-600">
          The actuarial model uses SSA 2023 life tables with health and family-history adjustments
          to estimate your personalized planning horizon.
        </p>
      </div>

      {/* Inputs */}
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        {/* Age */}
        <div>
          <label className="mb-1 block text-base font-semibold text-navy">
            Your current age: <span className="text-gold">{age}</span>
          </label>
          <input
            type="range"
            min={MIN_AGE}
            max={MAX_AGE}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-gold"
          />
          <div className="mt-1 flex justify-between text-base text-slate-400">
            <span>50</span><span>65</span><span>80</span>
          </div>
        </div>

        <RadioGroup label="Sex" options={SEX_OPTIONS} value={sex} onChange={setSex} />
        <RadioGroup label="Smoking history" options={SMOKING_OPTIONS} value={smoking} onChange={setSmoking} />
        <RadioGroup label="Overall health" options={HEALTH_OPTIONS} value={health} onChange={setHealth} />

        {/* Parental ages */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-base font-semibold text-navy">
              Mother&apos;s age at death (or current age if living)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={motherAge}
              onChange={(e) => setMotherAge(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-base font-semibold text-navy">
              Father&apos;s age at death (or current age if living)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={fatherAge}
              onChange={(e) => setFatherAge(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
          </div>
        </div>
      </div>

      {/* Vitality Window — V3 tone: positive, empowering, no urgency/scarcity */}
      <div className="rounded-xl border border-gold/30 bg-cream p-5">
        <h3 className="mb-1 text-base font-bold uppercase tracking-wide text-navy">
          Your Vitality Window
        </h3>

        {/* Verbatim V3 framing */}
        <p className="mb-4 text-base leading-relaxed text-slate-700">
          There&apos;s a window where health, energy, money, and freedom line up at the same time —
          for most people, roughly ages 58 to 68. It&apos;s the easiest, highest-reward moment to
          make an international move, and you&apos;re right in it. Later moves work too; this one is
          simply the smoothest. Think of it as a green light, not a deadline.
        </p>

        {/* Key numbers */}
        <div className="mb-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{vitalityWindowYears}</p>
            <p className="text-base font-medium text-slate-600">
              Peak active years<br />(ages {age}–{vitalityWindowEnd})
            </p>
          </div>
          <div className="rounded-lg bg-navy p-3 shadow-sm">
            <p className="text-2xl font-bold text-gold">{planningHorizonYears}</p>
            <p className="text-base font-medium text-cream/80">Total planning<br />horizon (years)</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-slate-700">{estimate.medianAge}</p>
            <p className="text-base font-medium text-slate-600">Median life<br />expectancy (age)</p>
          </div>
        </div>

        {/* Timeline visualization */}
        <div className="relative h-8">
          {/* Track */}
          <div className="absolute inset-y-0 left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-200" />
          {/* Vitality window (current → p75) */}
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-emerald-400"
            style={{ left: `${pct(age)}%`, width: `${pct(vitalityWindowEnd) - pct(age)}%` }}
          />
          {/* p75 → median */}
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-300"
            style={{ left: `${pct(vitalityWindowEnd)}%`, width: `${pct(estimate.medianAge) - pct(vitalityWindowEnd)}%` }}
          />
          {/* Markers */}
          {[
            { a: age, label: `${age}`, color: 'bg-navy' },
            { a: vitalityWindowEnd, label: `${vitalityWindowEnd}`, color: 'bg-emerald-500' },
            { a: estimate.medianAge, label: `${estimate.medianAge}`, color: 'bg-gold' },
          ].map(({ a, label, color }) => (
            <div key={a} className="absolute top-0 -translate-x-1/2" style={{ left: `${pct(a)}%` }}>
              <div className={`mx-auto h-8 w-1 rounded-full ${color}`} />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-base font-semibold text-slate-600">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-base">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Vitality window (ages {age}–{vitalityWindowEnd})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gold" /> Median lifespan (age {estimate.medianAge})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Extended horizon (to age {estimate.p25Age})
          </span>
        </div>

        <p className="mt-3 text-base italic text-slate-500">
          Based on SSA 2023 period life tables. Educational estimate only — not medical advice.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="rounded-xl border-2 border-slate-200 px-6 py-3.5 text-base font-semibold text-navy hover:border-navy"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 rounded-xl bg-gold py-3.5 text-base font-bold text-navy hover:bg-gold-dark"
        >
          Continue to Priorities →
        </button>
      </div>
    </div>
  );
}

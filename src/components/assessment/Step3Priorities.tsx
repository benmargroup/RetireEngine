'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAssessmentStore } from '@/store/assessmentStore';
import { calculateScores } from '@/lib/scoring-engine';
import type { Step3Data, ClimatePreference, NonNegotiables } from '@/types/assessment';

const CRITERIA: { key: keyof Omit<Step3Data, 'climatePreference' | 'hasHealthConditions' | 'nonNegotiables'>; label: string; description: string }[] = [
  { key: 'healthcare', label: 'Healthcare Quality', description: 'Access to specialists, hospital quality, private coverage availability' },
  { key: 'climate', label: 'Climate', description: 'Weather patterns, seasons, and year-round comfort' },
  { key: 'language', label: 'Language Accessibility', description: 'English prevalence, ease of daily life without fluency' },
  { key: 'proximity', label: 'Proximity to USA', description: 'Flight time and cost for family visits or emergencies' },
  { key: 'safety', label: 'Safety & Stability', description: 'Crime rates, political stability, rule of law' },
  { key: 'cost', label: 'Cost of Living', description: 'Overall affordability vs. your income level' },
  { key: 'expatCommunity', label: 'Expat Community', description: 'Size and infrastructure of the American expat community' },
  { key: 'infrastructure', label: 'Infrastructure', description: 'Roads, internet, utilities, transport reliability' },
  { key: 'culture', label: 'Culture & Lifestyle', description: 'Arts, food, entertainment, and daily life richness' },
  { key: 'banking', label: 'Banking & Finance', description: 'Ease of banking, financial infrastructure, dollar access' },
  { key: 'airQuality', label: 'Clean Air', description: 'Annual PM2.5 air quality — scored against WHO bands (Excellent ≤5, Good ≤10, Fair ≤15, Moderate ≤25, Poor ≤35, Unhealthy >35 µg/m³)' },
];

const CLIMATE_OPTIONS: { value: ClimatePreference; label: string; emoji: string }[] = [
  { value: 'mediterranean', label: 'Mediterranean (warm, mild winters)', emoji: '☀️' },
  { value: 'tropical', label: 'Tropical (warm year-round, humid)', emoji: '🌴' },
  { value: 'four_seasons', label: 'Four Seasons (distinct seasons)', emoji: '🍂' },
  { value: 'mild', label: 'Mild (temperate, no extremes)', emoji: '🌤️' },
  { value: '', label: 'No preference', emoji: '🌍' },
];

const PRIORITY_LABELS = ['Not important', 'Low', 'Moderate', 'High', 'Essential'];

function PrioritySlider({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-navy">{label}</span>
        <span className="text-xs font-medium text-gold">{PRIORITY_LABELS[value - 1]}</span>
      </div>
      <p className="mb-2 text-xs text-slate-500">{description}</p>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-gold"
        />
        <span className="w-5 text-center text-sm font-bold text-navy">{value}</span>
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      </div>
    </div>
  );
}

function NonNegotiablesBlock({
  nn,
  onChange,
}: {
  nn: NonNegotiables;
  onChange: (updated: NonNegotiables) => void;
}) {
  function toggle(key: keyof Omit<NonNegotiables, 'costCeiling'>) {
    onChange({ ...nn, [key]: nn[key] ? undefined : true });
  }

  const boolFilters: { key: keyof Omit<NonNegotiables, 'costCeiling'>; label: string; detail: string }[] = [
    { key: 'hospitalWithin30min', label: 'Class-A hospital ≤ 30 min', detail: 'Private specialty hospital within 30 minutes of target area' },
    { key: 'cleanAir', label: 'Clean air (PM2.5 ≤ 35 µg/m³)', detail: 'Hard filter: excludes locations with annual mean PM2.5 above WHO IT-1 (35 µg/m³). Currently: Thailand (38 µg/m³).' },
    { key: 'internet100', label: 'Internet ≥ 100 Mbps', detail: 'Reliable broadband at or above 100 Mbps in the target area' },
    { key: 'airportWithin1hr', label: 'International airport ≤ 1 hr', detail: 'International airport within 1 hour of the target area' },
    { key: 'taxFriendly', label: 'Tax-friendly to SS / pension', detail: 'Net-favorable tax treatment for US Social Security and pension income' },
  ];

  return (
    <div className="space-y-4">
      {/* Cost ceiling */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-navy">
          Monthly budget ceiling (optional)
        </label>
        <p className="mb-2 text-xs text-slate-500">
          Any country whose comfortable couple budget exceeds this amount will fail the filter.
          Leave at 0 to skip.
        </p>
        <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-gold focus-within:ring-1 focus-within:ring-gold">
          <span className="px-3 text-sm text-slate-500">$</span>
          <input
            type="number"
            min={0}
            step={100}
            value={nn.costCeiling ?? 0}
            onChange={(e) => onChange({ ...nn, costCeiling: Number(e.target.value) || undefined })}
            placeholder="0"
            className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-sm text-navy outline-none placeholder:text-slate-300"
          />
          <span className="px-3 text-xs text-slate-400">/mo</span>
        </div>
      </div>

      {/* Boolean toggles */}
      <div className="space-y-2">
        {boolFilters.map(({ key, label, detail }) => {
          const active = !!nn[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`flex w-full items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all ${
                active ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[10px] font-bold ${
                active ? 'border-red-500 bg-red-500 text-white' : 'border-slate-300 text-transparent'
              }`}>✕</span>
              <span>
                <span className={`block text-sm font-semibold ${active ? 'text-red-800' : 'text-navy'}`}>{label}</span>
                <span className="block text-xs text-slate-500">{detail}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Step3Priorities() {
  const { step3, step1, setStep3, setResults, setStep } = useAssessmentStore();

  const [priorities, setPriorities] = useState<Step3Data>({
    ...step3,
  });
  const [showNonNeg, setShowNonNeg] = useState(false);

  const activeFilterCount = [
    priorities.nonNegotiables.costCeiling && priorities.nonNegotiables.costCeiling > 0,
    priorities.nonNegotiables.hospitalWithin30min,
    priorities.nonNegotiables.cleanAir,
    priorities.nonNegotiables.internet100,
    priorities.nonNegotiables.airportWithin1hr,
    priorities.nonNegotiables.taxFriendly,
  ].filter(Boolean).length;

  function update<K extends keyof Step3Data>(key: K, value: Step3Data[K]) {
    setPriorities((prev) => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    const scores = calculateScores(
      priorities,
      step1.totalMonthlyIncome,
      step1.liquidAssets,
      priorities.nonNegotiables,
    );
    setStep3(priorities);
    setResults(scores);
    setStep(4);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 font-serif text-2xl font-bold text-navy">Your Priorities</h2>
        <p className="text-sm text-slate-600">
          Rate each factor by importance. These weights drive your personalized country rankings —
          be honest about what actually matters to you.
        </p>
      </div>

      {/* Priority sliders */}
      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
        {CRITERIA.map(({ key, label, description }) => (
          <PrioritySlider
            key={key}
            label={label}
            description={description}
            value={priorities[key] as number}
            onChange={(v) => update(key, v)}
          />
        ))}
      </div>

      {/* Climate preference */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">
          Preferred Climate
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CLIMATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('climatePreference', opt.value)}
              className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm transition-all ${
                priorities.climatePreference === opt.value
                  ? 'border-gold bg-navy text-white'
                  : 'border-slate-200 bg-white text-navy hover:border-gold/50'
              }`}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Healthcare flag */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="flex cursor-pointer items-start gap-4">
          <input
            type="checkbox"
            checked={priorities.hasHealthConditions}
            onChange={(e) => update('hasHealthConditions', e.target.checked)}
            className="mt-0.5 h-5 w-5 cursor-pointer accent-gold"
          />
          <div>
            <span className="block text-sm font-semibold text-navy">
              I have an ongoing health condition requiring regular specialist care
            </span>
            <span className="block text-xs text-slate-500">
              This doubles the weight of healthcare quality in your score — countries with
              world-class specialist access will rank significantly higher.
            </span>
          </div>
        </label>
      </div>

      {/* Non-Negotiables block */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setShowNonNeg((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="text-left">
            <span className="block text-sm font-bold text-navy">My Non-Negotiables</span>
            <span className="block text-xs text-slate-500">
              {activeFilterCount === 0
                ? 'Hard deal-breakers — countries that fail any active filter cannot rank in the top 3'
                : `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''} — failing countries will be pushed below the top 3`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                {activeFilterCount} active
              </span>
            )}
            {showNonNeg ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>
        </button>

        {showNonNeg && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            <NonNegotiablesBlock
              nn={priorities.nonNegotiables}
              onChange={(updated) => update('nonNegotiables', updated)}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="rounded-xl border-2 border-slate-200 px-6 py-3.5 text-sm font-semibold text-navy hover:border-navy"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 rounded-xl bg-gold py-3.5 text-base font-bold text-navy hover:bg-gold-dark"
        >
          Calculate My Matches →
        </button>
      </div>
    </div>
  );
}

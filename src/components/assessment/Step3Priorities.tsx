'use client';

import { useState } from 'react';
import { useAssessmentStore } from '@/store/assessmentStore';
import { calculateScores } from '@/lib/scoring-engine';
import type { Step3Data, ClimatePreference } from '@/types/assessment';
import { AlertTriangle } from 'lucide-react';

const CRITERIA: { key: keyof Omit<Step3Data, 'climatePreference' | 'hasHealthConditions'>; label: string; description: string }[] = [
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

export default function Step3Priorities() {
  const { step3, step1, setStep3, setResults, setStep } = useAssessmentStore();

  const [priorities, setPriorities] = useState<Step3Data>({
    ...step3,
  });

  function update<K extends keyof Step3Data>(key: K, value: Step3Data[K]) {
    setPriorities((prev) => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    const scores = calculateScores(
      priorities,
      step1.totalMonthlyIncome,
      step1.liquidAssets,
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
      {/* Medicare border warning */}
      <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-5">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            Medicare coverage stops at the U.S. border
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Retiring or spending extended time abroad requires private international
            health coverage until you return to U.S. soil — Medicare Parts A &amp; B do
            not provide coverage outside the United States.
          </p>
        </div>
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

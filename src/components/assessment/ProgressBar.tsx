'use client';

const STEPS = [
  { n: 1, label: 'Financial Picture' },
  { n: 2, label: 'Longevity Profile' },
  { n: 3, label: 'Your Priorities' },
  { n: 4, label: 'Your Matches' },
];

interface ProgressBarProps {
  currentStep: number;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <nav aria-label="Assessment progress" className="mb-10">
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const done = s.n < currentStep;
          const active = s.n === currentStep;
          return (
            <li key={s.n} className="flex flex-1 flex-col items-center gap-1.5">
              {/* connector line */}
              <div className="relative flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2 ${done || active ? 'bg-gold' : 'bg-slate-200'}`}
                  />
                )}
                {i < STEPS.length - 1 && (
                  <div
                    className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${done ? 'bg-gold' : 'bg-slate-200'}`}
                  />
                )}
                <div
                  className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    done
                      ? 'bg-gold text-white'
                      : active
                        ? 'bg-navy text-white ring-2 ring-gold ring-offset-2'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? '✓' : s.n}
                </div>
              </div>
              <span
                className={`hidden text-center text-xs font-medium sm:block ${
                  active ? 'text-navy' : done ? 'text-gold-dark' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
      {/* Mobile: current step label */}
      <p className="mt-2 text-center text-sm font-semibold text-navy sm:hidden">
        Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.label}
      </p>
    </nav>
  );
}

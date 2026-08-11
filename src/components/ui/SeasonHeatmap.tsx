'use client';

/**
 * SeasonHeatmap.tsx
 * -------------------------------------------------------------------------
 * Feature 5 (Seasonality / Best-Months Layer).
 *
 * Displays a 12-month color-coded grid (go / shoulder / avoid) with tap/hover
 * reason tags, sourced from LocationData.monthlyRatings in ss-engine.ts.
 * -------------------------------------------------------------------------
 */

import { useState } from 'react';
import type { MonthRating, MonthRatingValue } from '@/lib/ss-engine';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const RATING_STYLES: Record<MonthRatingValue, { bg: string; text: string; label: string }> = {
  go: { bg: 'bg-forest', text: 'text-white', label: 'Go' },
  shoulder: { bg: 'bg-amber-400', text: 'text-navy', label: 'Shoulder' },
  avoid: { bg: 'bg-crimson', text: 'text-white', label: 'Avoid' },
};

export interface SeasonHeatmapProps {
  monthlyRatings?: MonthRating[];
}

/** Reusable 12-month climate/hazard heatmap. Renders nothing if no data exists. */
export default function SeasonHeatmap({ monthlyRatings }: SeasonHeatmapProps) {
  const [activeMonth, setActiveMonth] = useState<number | null>(null);

  if (!monthlyRatings || monthlyRatings.length === 0) return null;

  const sorted = [...monthlyRatings].sort((a, b) => a.month - b.month);
  const active = sorted.find((m) => m.month === activeMonth);

  return (
    <div>
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
        {sorted.map((m) => {
          const style = RATING_STYLES[m.rating];
          return (
            <button
              key={m.month}
              type="button"
              onMouseEnter={() => setActiveMonth(m.month)}
              onMouseLeave={() => setActiveMonth(null)}
              onClick={() => setActiveMonth(activeMonth === m.month ? null : m.month)}
              aria-label={`${MONTH_LABELS[m.month - 1]}: ${style.label}`}
              className={`flex flex-col items-center rounded-md py-2 text-[10px] font-semibold transition ${style.bg} ${style.text}`}
            >
              {MONTH_LABELS[m.month - 1]}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="mt-2 rounded-lg border border-sage-light/40 bg-white px-3 py-2 text-xs text-charcoal">
          <span className="font-semibold text-navy">{MONTH_LABELS[active.month - 1]}</span>
          {' — '}
          {active.reasons.join('; ')}
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-[11px] text-charcoal">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-forest" /> Go
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Shoulder
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-crimson" /> Avoid
        </span>
      </div>
    </div>
  );
}
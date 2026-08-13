'use client';

/**
 * OrbitItineraryView.tsx
 * -------------------------------------------------------------------------
 * Feature 4 (Anchor vs. Orbit Strategy Engine).
 *
 * Renders an OrbitPlan: the mandatory, non-dismissible trade-off disclosure
 * panel, followed by the 12-month rotation as a series of leg cards.
 * -------------------------------------------------------------------------
 */

import { AlertTriangle } from 'lucide-react';
import type { OrbitPlan } from '@/lib/orbit-engine';
import { ORBIT_TRADE_OFFS } from '@/lib/orbit-engine';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function OrbitItineraryView({ plan }: { plan: OrbitPlan }) {
  if (plan.legs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-base text-charcoal">
        Not enough destination data yet to build an Orbit rotation. Check back as more countries are added.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mandatory trade-off panel — non-dismissible, always shown for every Orbit view */}
      <div className="rounded-xl border-2 border-crimson bg-crimson/5 p-5">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle size={18} className="text-crimson" />
          <p className="text-base font-bold text-crimson">Orbit Mode — Important Trade-Offs</p>
        </div>
        <p className="mb-3 text-base text-charcoal">
          Orbit mode plans a rotation using tourist entry only — not residency. Before considering this strategy, understand:
        </p>
        <ul className="space-y-1.5">
          {ORBIT_TRADE_OFFS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-base text-charcoal">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* 12-month rotation */}
      <div className="space-y-3">
        {plan.legs.map((leg, i) => (
          <div key={`${leg.locationId}-${i}`} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-serif text-lg font-bold text-navy">{leg.label}</h4>
              <span className="rounded-full bg-forest/10 px-3 py-1 text-base font-semibold text-forest">
                {MONTH_LABELS[leg.startMonth - 1]}
                {leg.startMonth !== leg.endMonth && ` – ${MONTH_LABELS[leg.endMonth - 1]}`}
                {' '}({leg.monthCount} {leg.monthCount === 1 ? 'month' : 'months'})
              </span>
            </div>
            {leg.reasons.length > 0 && (
              <p className="mb-2 text-base text-charcoal">{leg.reasons.join(' · ')}</p>
            )}
            {leg.entryNote && <p className="text-base text-charcoal">{leg.entryNote}</p>}
            <p className="mt-2 text-base font-medium text-charcoal">
              Max legal continuous stay: ~{leg.maxStayMonths} {leg.maxStayMonths === 1 ? 'month' : 'months'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
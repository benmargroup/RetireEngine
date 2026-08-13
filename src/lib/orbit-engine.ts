/**
 * orbit-engine.ts
 * -------------------------------------------------------------------------
 * Feature 4 (Anchor vs. Orbit Strategy Engine).
 *
 * Pure, deterministic function that builds a 12-month rotation plan across
 * countries that have touristEntry data (currently India, Vietnam, Sri Lanka
 * — see ss-engine.ts). Ignores retiree visa income thresholds entirely, since
 * Orbit mode is explicitly a tourist-entry-only strategy, not a residency one.
 *
 * Algorithm (greedy month-filler):
 *   For each of the 12 months, pick the best-rated eligible candidate
 *   (Feature 5's 'go' > 'shoulder' > 'avoid'), preferring to continue the
 *   current stay over switching unnecessarily. Never lets a continuous stay
 *   exceed a country's legal tourist limit (touristEntry.extendableToDays).
 *
 * IMPORTANT: this is a disclosure/planning tool, not legal advice. Every
 * consumer of OrbitPlan MUST render the mandatory trade-off panel — see
 * ORBIT_TRADE_OFFS below and <OrbitItineraryView>.
 * -------------------------------------------------------------------------
 */

import { getLocation } from './ss-engine';
import type { LocationData, MonthRatingValue } from './ss-engine';

const RATING_SCORE: Record<MonthRatingValue, number> = { go: 3, shoulder: 2, avoid: 1 };

/** One continuous stay in a single location within the 12-month plan. */
export interface OrbitLeg {
  locationId: string;
  label: string;
  flag?: string;
  /** 1 = January ... 12 = December. */
  startMonth: number;
  /** Inclusive. */
  endMonth: number;
  monthCount: number;
  /** Climate/hazard reasons for the months covered by this leg. */
  reasons: string[];
  /** Max legal continuous tourist stay for this location, in whole months (approx). */
  maxStayMonths: number;
  entryNote?: string;
}

export interface OrbitPlan {
  legs: OrbitLeg[];
  /** Locations actually used in this plan, in first-visited order. */
  candidateIds: string[];
}

/** Mandatory trade-off disclosures. MUST be rendered on every Orbit view — never optional, never dismissible. */
export const ORBIT_TRADE_OFFS: string[] = [
  'No legal residency rights',
  'No local healthcare enrollment',
  'No tax-residency benefit',
  'Legal gray area',
  'Tightening border enforcement',
];

/** Approximate max continuous stay in whole months, from touristEntry.extendableToDays. */
function maxStayMonths(loc: LocationData): number {
  const days = loc.touristEntry?.extendableToDays ?? 30;
  return Math.max(1, Math.floor(days / 30));
}

/**
 * Build a 12-month Orbit rotation across the given candidate location IDs.
 * Only locations with both monthlyRatings (Feature 5) and touristEntry
 * (Feature 4) data are used; others are silently skipped.
 */
export function computeOrbitPlan(candidateIds: string[]): OrbitPlan {
  const candidates = candidateIds
    .map((id) => getLocation(id))
    .filter((loc): loc is LocationData => !!loc && !!loc.monthlyRatings && !!loc.touristEntry);

  if (candidates.length === 0) {
    return { legs: [], candidateIds: [] };
  }

  const legs: OrbitLeg[] = [];
  let currentId: string | null = null;
  let currentStreak = 0;
  const usedFully = new Set<string>();
  const visitedOrder: string[] = [];

  for (let month = 1; month <= 12; month++) {
    // Eligible = has monthlyRatings/touristEntry AND hasn't used up its legal stay this cycle.
    let pool = candidates.filter((c) => !usedFully.has(c.id));
    if (pool.length === 0) {
      // Everyone's used their full legal stay for the year — start a fresh cycle
      // rather than leave the calendar with gaps.
      usedFully.clear();
      pool = candidates;
    }

    const scoreOf = (loc: LocationData) => {
      const rating = loc.monthlyRatings!.find((m) => m.month === month);
      return rating ? RATING_SCORE[rating.rating] : 0;
    };

    // Prefer staying at the current location if it's still eligible, hasn't hit
    // its max stay, and is still at least 'shoulder' this month — avoids
    // unnecessary hopping between countries for marginal rating differences.
    let chosen: LocationData;
    const current = currentId ? pool.find((c) => c.id === currentId) : undefined;
    if (current && currentStreak < maxStayMonths(current) && scoreOf(current) >= 2) {
      chosen = current;
    } else {
      chosen = pool.reduce((best, c) => (scoreOf(c) > scoreOf(best) ? c : best), pool[0]);
    }

    if (chosen.id === currentId) {
      currentStreak += 1;
    } else {
      currentId = chosen.id;
      currentStreak = 1;
      if (!visitedOrder.includes(chosen.id)) visitedOrder.push(chosen.id);
    }
    if (currentStreak >= maxStayMonths(chosen)) {
      usedFully.add(chosen.id);
    }

    const rating = chosen.monthlyRatings!.find((m) => m.month === month);
    const lastLeg = legs[legs.length - 1];
    if (lastLeg && lastLeg.locationId === chosen.id && lastLeg.endMonth === month - 1) {
      lastLeg.endMonth = month;
      lastLeg.monthCount += 1;
      if (rating) {
        for (const r of rating.reasons) {
          if (!lastLeg.reasons.includes(r)) lastLeg.reasons.push(r);
        }
      }
    } else {
      legs.push({
        locationId: chosen.id,
        label: chosen.label,
        startMonth: month,
        endMonth: month,
        monthCount: 1,
        reasons: rating ? [...rating.reasons] : [],
        maxStayMonths: maxStayMonths(chosen),
        entryNote: chosen.touristEntry?.note,
      });
    }
  }

  return { legs, candidateIds: visitedOrder };
}
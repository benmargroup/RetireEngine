/**
 * actuarial-engine.ts
 * -------------------------------------------------------------------------
 * Lifetime SS — personalized longevity estimator.
 *
 * Pure, deterministic TypeScript. No network, no LLM, no side effects.
 * Given a person's age, sex, and a few health/family signals, it returns a
 * personalized median life expectancy plus simple probability bands.
 *
 * Method (fully transparent, on purpose):
 *   1. Look up baseline remaining years from an SSA-style period life table.
 *   2. Multiply those remaining years by rule-based health/lifestyle factors.
 *   3. medianAge = currentAge + adjustedRemainingYears.
 *
 * IMPORTANT — data provenance:
 *   The baseline table below is APPROXIMATED from the SSA period life table
 *   (2023, as used in the 2026 OASDI Trustees Report). Values are close to,
 *   but not identical to, the official figures. Before production, replace
 *   BASELINE_REMAINING_YEARS with the exact official table and store it in
 *   the dated/sourced data layer (see Module 2 conventions).
 *   Source: https://www.ssa.gov/oact/STATS/table4c6.html
 *
 * These are educational planning estimates, not medical or actuarial advice.
 * -------------------------------------------------------------------------
 */

/** Supported sexes for the period life table lookup. */
export type Sex = 'male' | 'female';

/** Smoking status buckets. */
export type SmokingStatus = 'never' | 'former' | 'current';

/** Self-reported general health buckets. */
export type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor';

/** User-provided inputs for the longevity estimate. */
export interface LongevityInputs {
  /** Current age in whole years. Supported range: 50–80. */
  age: number;
  sex: Sex;
  smoking: SmokingStatus;
  health: HealthStatus;
  /** Mother's age at death, OR her current age if she is still living. Optional. */
  motherAgeAtDeath?: number;
  /** Father's age at death, OR his current age if he is still living. Optional. */
  fatherAgeAtDeath?: number;
}

/** Result of the longevity estimate. */
export interface LongevityOutput {
  /** Median age this person is estimated to reach (whole years, e.g. 87). */
  medianAge: number;
  /** ~75% probability of living to at least this age (a younger, more likely age). */
  p75Age: number;
  /** ~25% probability of living to at least this age (an older, less likely age). */
  p25Age: number;
  /** Combined percentage modifier applied to baseline remaining years (e.g. +23 means +23%). */
  adjustmentFactor: number;
  /** Baseline remaining years from the table, before adjustment (useful for display/debug). */
  baselineRemainingYears: number;
  /** Remaining years after applying all adjustment factors. */
  adjustedRemainingYears: number;
}

/** Lowest supported age for the baseline table. */
export const MIN_AGE = 50;
/** Highest supported age for the baseline table. */
export const MAX_AGE = 80;

/**
 * Baseline remaining life expectancy (years) by exact age, 50–80.
 * Index 0 === age 50 ... index 30 === age 80.
 * Approximated from the SSA period life table (2023 TR). Replace with the
 * exact official table in the data layer before launch.
 */
const BASELINE_REMAINING_YEARS: Record<Sex, readonly number[]> = {
  male: [
    /* 50 */ 29.9, 29.1, 28.2, 27.4, 26.5,
    /* 55 */ 25.7, 24.9, 24.1, 23.3, 22.5,
    /* 60 */ 21.6, 20.8, 19.9, 19.1, 18.3,
    /* 65 */ 17.5, 16.9, 16.3, 15.7, 15.0,
    /* 70 */ 14.4, 13.8, 13.2, 12.5, 11.9,
    /* 75 */ 11.3, 10.7, 10.1, 9.5, 8.9,
    /* 80 */ 8.4,
  ],
  female: [
    /* 50 */ 33.4, 32.5, 31.6, 30.7, 29.8,
    /* 55 */ 28.9, 28.0, 27.1, 26.2, 25.3,
    /* 60 */ 24.4, 23.5, 22.6, 21.8, 21.0,
    /* 65 */ 20.2, 19.5, 18.8, 18.1, 17.4,
    /* 70 */ 16.8, 16.1, 15.4, 14.7, 14.0,
    /* 75 */ 13.4, 12.7, 12.1, 11.4, 10.8,
    /* 80 */ 10.2,
  ],
};

/**
 * Adjustment multipliers, expressed as fractional deltas (0.05 === +5%).
 * Applied multiplicatively so factors compound rather than sum. Kept in one
 * place so the rules are auditable and easy to tune.
 */
const SMOKING_DELTA: Record<SmokingStatus, number> = {
  never: 0.05, // non-smokers tend to outlive the mixed-population baseline
  former: 0.0,
  current: -0.12,
};

const HEALTH_DELTA: Record<HealthStatus, number> = {
  excellent: 0.1,
  good: 0.0,
  fair: -0.1,
  poor: -0.2,
};

/** Round to a fixed number of decimals, avoiding float boundary artifacts (e.g. 1.005). */
function roundTo(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  // Add a tiny epsilon before rounding to defeat binary-float representation errors.
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Clamp a value into an inclusive range. */
function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Parental-longevity delta.
 * A parent value is "age at death, or current age if still living", so a
 * living 88-year-old parent correctly counts as >= 85.
 *   - Both parents >= 85 ...... +8%
 *   - Exactly one parent >= 85 . +4%
 *   - Both parents died < 70 ... -8%
 *   - Otherwise / unknown ...... 0%
 */
export function parentalDelta(
  motherAge?: number,
  fatherAge?: number,
): number {
  const known: number[] = [];
  if (typeof motherAge === 'number' && !Number.isNaN(motherAge)) known.push(motherAge);
  if (typeof fatherAge === 'number' && !Number.isNaN(fatherAge)) known.push(fatherAge);

  if (known.length === 0) return 0;

  const longLived = known.filter((a) => a >= 85).length;
  if (longLived === 2) return 0.08;
  if (longLived === 1) return 0.04;

  // Only apply the penalty when BOTH parents are known and both died before 70.
  if (known.length === 2 && known.every((a) => a < 70)) return -0.08;

  return 0;
}

/**
 * Look up baseline remaining years for an age within [MIN_AGE, MAX_AGE].
 * Ages outside the range are clamped to the nearest supported age.
 */
export function baselineRemainingYears(age: number, sex: Sex): number {
  const clampedAge = clamp(Math.round(age), MIN_AGE, MAX_AGE);
  const index = clampedAge - MIN_AGE;
  return BASELINE_REMAINING_YEARS[sex][index];
}

/**
 * Compute a personalized longevity estimate.
 *
 * @param inputs LongevityInputs
 * @returns LongevityOutput with medianAge and simple probability bands.
 */
export function estimateLongevity(inputs: LongevityInputs): LongevityOutput {
  const { age, sex, smoking, health, motherAgeAtDeath, fatherAgeAtDeath } = inputs;

  const baseline = baselineRemainingYears(age, sex);

  // Combine the three fractional deltas multiplicatively so they compound.
  const smokingF = 1 + SMOKING_DELTA[smoking];
  const healthF = 1 + HEALTH_DELTA[health];
  const parentF = 1 + parentalDelta(motherAgeAtDeath, fatherAgeAtDeath);

  const combined = smokingF * healthF * parentF;

  // Never let the estimate fall below a small floor of remaining years.
  const adjustedRemaining = Math.max(1, baseline * combined);

  const clampedAge = clamp(Math.round(age), MIN_AGE, MAX_AGE);
  const medianAge = Math.round(clampedAge + adjustedRemaining);

  return {
    medianAge,
    // Simple, transparent bands. p75 is a younger (more likely) age; p25 older (less likely).
    // These fixed offsets are a deliberate simplification; a future version can derive
    // true percentiles from the full survival curve.
    p75Age: medianAge - 5,
    p25Age: medianAge + 6,
    adjustmentFactor: roundTo((combined - 1) * 100, 1),
    baselineRemainingYears: roundTo(baseline, 1),
    adjustedRemainingYears: roundTo(adjustedRemaining, 1),
  };
}

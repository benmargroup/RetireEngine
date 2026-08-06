/**
 * ss-engine.ts
 * -------------------------------------------------------------------------
 * RetireEngine — Social Security claiming + geo-arbitrage math.
 *
 * MODULE 6 EXTENSION (2026-01):
 *   - Added monthlyBudgetCoupleLow / monthlyBudgetCoupleHigh to LocationData.
 *   - Added 5 expat countries: italy, colombia, france, malaysia, thailand.
 *   - Added couple-budget fields to all existing entries.
 *   - LOCATIONS is the single source of truth for all money/visa/cost/tax data.
 *     scoring-engine.ts imports from here; never duplicate these constants.
 *   Re-verify all figures quarterly. Each record carries lastVerified comment.
 *
 * Pure, deterministic TypeScript. Given an FRA benefit, a personalized
 * median lifespan (from actuarial-engine), and a target location, it returns
 * benefit scenarios for ages 62 / 65 / 67 / 70, plus the 62-vs-70 break-even
 * age and an actuarially "optimal" claiming age.
 *
 * All rules reflect 2026 SSA figures. FRA is 67 for anyone born 1960 or later.
 * Results are educational planning estimates, not financial advice.
 * -------------------------------------------------------------------------
 */

/** The four claiming ages this product compares. */
export const CLAIMING_AGES = [62, 65, 67, 70] as const;
export type ClaimingAge = (typeof CLAIMING_AGES)[number];

/**
 * SSA benefit factor relative to the Primary Insurance Amount (the FRA-67 benefit).
 *   62 -> 70.00%  (30% early reduction)
 *   65 -> 86.67%  (13.33% early reduction)   <-- 13.33%, NOT 16.67%
 *   67 -> 100%    (Full Retirement Age)
 *   70 -> 124%    (+24% delayed retirement credits: 8%/yr for 3 years)
 * Source: SSA early-retirement / delayed-credit rules for FRA 67.
 */
export const SSA_BENEFIT_FACTOR: Record<ClaimingAge, number> = {
  62: 0.7,
  65: 0.8667,
  67: 1.0,
  70: 1.24,
};

/** Tax posture flags a location can carry (drives warnings + CTAs). */
export type TaxPosture =
  | 'no-state-income-tax' // e.g. TX, FL
  | 'state-taxes-withdrawals' // taxes IRA/401k/pension (SS usually exempt)
  | 'territorial' // foreign income (incl. US SS) untaxed locally
  | 'treaty-us-taxes-ss' // treaty leaves SS taxed by the US only
  | 'worldwide-income-tax'; // resident taxed on worldwide income (high drag)

/** A domestic state or expat destination the user can target. */
export interface LocationData {
  /** Stable slug id, e.g. 'mexico', 'texas'. */
  id: string;
  /** Display label, e.g. 'Mexico (Mérida)'. */
  label: string;
  kind: 'us-state' | 'expat';
  /** Currency the cost figures are expressed in. Always 'USD' here. */
  currency: 'USD';
  /** Comfortable monthly cost of living for one person, in USD. */
  monthlyComfortableCost: number;
  taxPosture: TaxPosture;
  /** Short, human-readable tax note for display. */
  taxNote: string;
  /** Expat only: name of the relevant residency visa. */
  visaName?: string;
  /** Expat only: minimum MONTHLY income to qualify via the income route, USD. */
  visaIncomeMinMonthly?: number;
  /** Expat only: savings-route alternative (lump sum), USD. Undefined = no savings route. */
  visaSavingsAlt?: number;
  /** Short healthcare/Medicare note for display. */
  healthcareNote: string;
  /** Comfortable monthly budget for TWO people (couple), USD/mo. */
  monthlyBudgetCoupleLow?: number;
  /** Comfortable monthly budget for TWO people (couple), USD/mo. */
  monthlyBudgetCoupleHigh?: number;
}

/**
 * Canonical location dataset (2026 figures).
 * SINGLE SOURCE OF TRUTH — scoring-engine.ts reads from here.
 * Each record carries a lastVerified comment; re-verify quarterly.
 * Euro/THB/MYR thresholds converted at 2026-01 spot rates and rounded.
 */
export const LOCATIONS: readonly LocationData[] = [
  // ── US states ──────────────────────────────────────────────────────────
  {
    id: 'texas',
    label: 'Texas',
    kind: 'us-state',
    currency: 'USD',
    monthlyComfortableCost: 3000,
    taxPosture: 'no-state-income-tax',
    taxNote: 'No state income tax on Social Security or IRA/401(k) withdrawals.',
    healthcareNote: 'Medicare works normally. Home insurance and property tax are the cost drivers.',
    monthlyBudgetCoupleLow: 5200,
    monthlyBudgetCoupleHigh: 7000, // lastVerified: 2026-01; source: Numbeo Dallas/Austin
  },
  {
    id: 'florida',
    label: 'Florida',
    kind: 'us-state',
    currency: 'USD',
    monthlyComfortableCost: 3300,
    taxPosture: 'no-state-income-tax',
    taxNote: 'No state income tax. Home insurance is the wildcard cost.',
    healthcareNote: 'Medicare works normally. Budget for higher homeowner insurance.',
    monthlyBudgetCoupleLow: 5600,
    monthlyBudgetCoupleHigh: 7500, // lastVerified: 2026-01; source: Numbeo Tampa/Orlando
  },
  // ── Expat destinations ─────────────────────────────────────────────────
  {
    id: 'mexico',
    label: 'Mexico (Mérida)',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1450,
    taxPosture: 'treaty-us-taxes-ss',
    taxNote: 'US–Mexico treaty: Social Security is taxed by the US, not Mexico. Territorial for most other foreign income.',
    visaName: 'Temporary Resident Visa',
    visaIncomeMinMonthly: 4300,
    visaSavingsAlt: 73000,
    healthcareNote: 'Medicare is not valid in Mexico. Use private cover (~$1,500–3,000/yr) or IMSS.',
    monthlyBudgetCoupleLow: 2500,
    monthlyBudgetCoupleHigh: 3500, // lastVerified: 2026-01; source: INM income tables, Numbeo Mérida
  },
  {
    id: 'portugal',
    label: 'Portugal',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1900,
    taxPosture: 'worldwide-income-tax',
    taxNote: 'Tax resident on worldwide income; the NHR flat-tax regime is effectively closed (March 2025).',
    visaName: 'D7 Passive Income Visa',
    visaIncomeMinMonthly: 1000, // €920/mo single; €1,380/mo couple
    visaSavingsAlt: 12000, // ~€11,040 savings buffer
    healthcareNote: 'Medicare is not valid abroad. SNS public access as a resident; private ~$90–160/mo.',
    monthlyBudgetCoupleLow: 3200,
    monthlyBudgetCoupleHigh: 4400, // lastVerified: 2026-01; source: SEF/AIMA D7 rules, Numbeo Lisbon/Porto
  },
  {
    id: 'costa-rica',
    label: 'Costa Rica',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1800,
    taxPosture: 'territorial',
    taxNote: 'Territorial: foreign income, including US Social Security, is not taxed locally. Mandatory CAJA enrollment (~7–11% of income).',
    visaName: 'Pensionado Visa',
    visaIncomeMinMonthly: 1000,
    visaSavingsAlt: undefined, // pension income required; no standard savings alternative
    healthcareNote: 'Medicare is not valid abroad. Mandatory CAJA enrollment (~7–11% of income).',
    monthlyBudgetCoupleLow: 3000,
    monthlyBudgetCoupleHigh: 4000, // lastVerified: 2026-01; source: ARCR, ARCR surveys
  },
  {
    id: 'panama',
    label: 'Panama',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1700,
    taxPosture: 'territorial',
    taxNote: 'Territorial + USD economy: foreign income untaxed, no currency risk.',
    visaName: 'Pensionado Visa',
    visaIncomeMinMonthly: 1000,
    visaSavingsAlt: undefined, // lifetime pension income required
    healthcareNote: 'Medicare is not valid abroad. Affordable private cover; retiree discounts on hospitals.',
    monthlyBudgetCoupleLow: 2800,
    monthlyBudgetCoupleHigh: 3800, // lastVerified: 2026-01; source: MICI Panama, AARP International
  },
  {
    id: 'spain',
    label: 'Spain',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 2100,
    taxPosture: 'worldwide-income-tax',
    taxNote: 'Tax resident on worldwide income — the high-tax option. Model the drag first.',
    visaName: 'Non-Lucrative Visa',
    visaIncomeMinMonthly: 2600, // ~€2,400/mo
    visaSavingsAlt: 31000, // ~€28,800/yr shown as savings
    healthcareNote: 'Medicare is not valid abroad. NLV requires private zero-copay insurance.',
    monthlyBudgetCoupleLow: 3000,
    monthlyBudgetCoupleHigh: 4200, // lastVerified: 2026-01; source: Spanish consulate, Numbeo Valencia/Alicante
  },
  // ── New in Module 6 ────────────────────────────────────────────────────
  {
    id: 'italy',
    label: 'Italy (South)',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 2000,
    taxPosture: 'worldwide-income-tax',
    taxNote: 'Tax resident on worldwide income. 7% flat-rate scheme available for retirees relocating to towns under 20,000 population in qualifying southern regions — 10-year cap, significant saving. Full Italian tax otherwise.',
    visaName: 'Elective Residency Visa',
    visaIncomeMinMonthly: 2800, // ~€2,583/mo; €31,000/yr required
    visaSavingsAlt: undefined, // passive income required — savings alone do not qualify
    healthcareNote: 'Medicare is not valid abroad. SSN public healthcare available after enrollment as resident. Private supplement recommended ~€100–200/mo.',
    monthlyBudgetCoupleLow: 3400,
    monthlyBudgetCoupleHigh: 4800, // lastVerified: 2026-01; source: Italian Ministry of Foreign Affairs, Numbeo Sicily/Calabria
  },
  {
    id: 'colombia',
    label: 'Colombia (Medellín)',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1500,
    taxPosture: 'territorial', // closest; foreign pension largely exempt per 2024 reform — see taxNote
    taxNote: 'Foreign pension income largely exempt under 2024 Colombian tax reform (Ley 2277). Private health insurance mandatory; cannot use public EPS as a foreigner.',
    visaName: 'Pensionado Visa (M-11)',
    visaIncomeMinMonthly: 1400, // 3× 2026 Colombia minimum wage (~COP 5.4M/mo ÷ current rate)
    visaSavingsAlt: undefined, // pension income required; rentista alternative ~$3,900/mo is harder
    healthcareNote: 'Medicare is not valid abroad. Private health insurance mandatory (~$100–300/mo). Excellent private hospitals in Medellín (Clínica Las Américas, Clínica del Campestre).',
    monthlyBudgetCoupleLow: 2600,
    monthlyBudgetCoupleHigh: 3600, // lastVerified: 2026-01; source: Migración Colombia M-11 visa rules, Numbeo Medellín
  },
  {
    id: 'france',
    label: 'France (Provence)',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 2600,
    taxPosture: 'worldwide-income-tax',
    taxNote: 'Tax resident on worldwide income. US–France tax treaty. World-class healthcare via French PUMA system for residents. Language barrier significant outside tourist zones.',
    visaName: 'Long-Stay Visitor Visa (Visiteur)',
    visaIncomeMinMonthly: 1600, // no fixed statutory minimum; consular discretion ~€1,500/mo
    visaSavingsAlt: undefined, // consular discretion — no formal savings-route alternative
    healthcareNote: 'Medicare is not valid abroad. French PUMA public healthcare after 3 months residence. Private mutuelle supplement ~€80–150/mo strongly recommended.',
    monthlyBudgetCoupleLow: 4200,
    monthlyBudgetCoupleHigh: 5800, // lastVerified: 2026-01; source: French consulate guidance, Numbeo Marseille/Nice
  },
  {
    id: 'malaysia',
    label: 'Malaysia (Kuala Lumpur)',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1700,
    taxPosture: 'territorial',
    taxNote: 'Foreign income mostly untaxed in Malaysia. IMPORTANT: MM2H Silver requires a fixed deposit (RM150k/~$32k) AND offshore income (RM5,000/mo/~$1,050) AND a property purchase (≥RM600k/~$128k). This is NOT a simple income-or-savings either-or; all three are required.',
    visaName: 'MM2H Silver Tier',
    visaIncomeMinMonthly: 1050, // RM5,000/mo offshore income (~$1,050 at 2026-01 rates)
    visaSavingsAlt: 32000, // RM150k fixed deposit (~$32k) — property purchase ALSO required; see taxNote
    healthcareNote: 'Medicare is not valid abroad. World-class private hospitals in KL (Gleneagles, Pantai). Mandatory health insurance required (~$200–600/yr). Public hospitals available at very low cost.',
    monthlyBudgetCoupleLow: 2800,
    monthlyBudgetCoupleHigh: 3800, // lastVerified: 2026-01; source: mm2h.gov.my Silver tier rules, Numbeo KL
  },
  {
    id: 'thailand',
    label: 'Thailand (Chiang Mai)',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1400,
    taxPosture: 'territorial',
    taxNote: 'Foreign income untaxed if not remitted in the same tax year. Mandatory health insurance required for Non-O-A (~$600–2,000/yr). 20+ hour flights from the US.',
    visaName: 'Retirement Visa (Non-O-A)',
    visaIncomeMinMonthly: 1800, // ฿65,000/mo ≈ $1,800 at 2026-01 rates
    visaSavingsAlt: 22000, // ฿800,000 ≈ $22,000 in Thai bank account
    healthcareNote: 'Medicare is not valid abroad. Mandatory health insurance for Non-O-A. Excellent private hospitals in Bangkok (Bumrungrad) and Chiang Mai. Annual visa renewal required.',
    monthlyBudgetCoupleLow: 2400,
    monthlyBudgetCoupleHigh: 3400, // lastVerified: 2026-01; source: Royal Thai Embassy Non-O-A rules, Numbeo Chiang Mai
  },
];

/** Look up a location by id; returns undefined if not found. */
export function getLocation(id: string): LocationData | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

/** Inputs to the SS engine. */
export interface SSCalculationInputs {
  /** Estimated monthly benefit at FRA (age 67), in USD. */
  fraBenefit: number;
  /** Current age in whole years. */
  currentAge: number;
  /** Personalized median lifespan from actuarial-engine. */
  medianLifespan: number;
  /** Optional investable assets, for the portfolio-gap comparison. */
  investableAssets?: number;
  /** Target location (drives coverage, visa, tax and healthcare context). */
  targetLocation: LocationData;
}

/** One claiming-age scenario. */
export interface BenefitScenario {
  claimingAge: ClaimingAge;
  /** Monthly benefit at this claiming age, USD (floored to whole dollar). */
  monthlyBenefit: number;
  /** Annual benefit, USD. */
  annualBenefit: number;
  /** Nominal lifetime total to median lifespan: monthly * 12 * max(0, median - claimingAge). */
  lifetimeTotal: number;
  /** Annual benefit / local annual comfortable cost. >= 1 means SS covers the comfortable budget. */
  coverageRatio: number;
  /** 4% rule: extra portfolio needed to close any annual shortfall = max(0, cost - benefit) * 25. */
  requiredPortfolioGap: number;
  /** True if this claiming age's monthly benefit meets the location's income-route visa minimum. */
  meetsVisaIncome: boolean;
}

/** Full engine result. */
export interface SSEngineResults {
  scenarios: BenefitScenario[];
  /** Age at which cumulative cash from waiting to 70 overtakes claiming at 62 (nominal). */
  breakEvenAge62vs70: number;
  /** Claiming age that maximizes nominal lifetime SS dollars at the median lifespan. */
  recommendedClaimingAge: ClaimingAge;
  /** Convenience: the recommended scenario object. */
  recommendedScenario: BenefitScenario;
  /** Local annual comfortable cost used across scenarios, USD. */
  localAnnualCost: number;
}

/** Round to 2 decimals with epsilon guard (money-safe). */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Floor to a whole dollar (SSA rounds the payable benefit down to the next lower dollar). */
function floorDollar(value: number): number {
  return Math.floor(value + 1e-9);
}

/**
 * Break-even age where cumulative benefits from claiming at 70 overtake 62.
 * Solved from: a62 * (A - 62) === a70 * (A - 70)  =>  A = (70*a70 - 62*a62) / (a70 - a62)
 * where aXX is the ANNUAL benefit at age XX. Nominal (no COLA/discounting).
 */
export function breakEvenAge62vs70(fraBenefit: number): number {
  const a62 = floorDollar(fraBenefit * SSA_BENEFIT_FACTOR[62]) * 12;
  const a70 = floorDollar(fraBenefit * SSA_BENEFIT_FACTOR[70]) * 12;
  const denom = a70 - a62;
  if (denom <= 0) return Number.POSITIVE_INFINITY; // guard; never happens with real factors
  const age = (70 * a70 - 62 * a62) / denom;
  return round2(age);
}

/**
 * Build the four benefit scenarios and the summary (break-even + recommendation).
 */
export function calculateSSResults(inputs: SSCalculationInputs): SSEngineResults {
  const { fraBenefit, medianLifespan, targetLocation } = inputs;

  const localAnnualCost = targetLocation.monthlyComfortableCost * 12;
  const visaMin = targetLocation.visaIncomeMinMonthly; // undefined for US states

  const scenarios: BenefitScenario[] = CLAIMING_AGES.map((claimingAge) => {
    const monthlyBenefit = floorDollar(fraBenefit * SSA_BENEFIT_FACTOR[claimingAge]);
    const annualBenefit = monthlyBenefit * 12;

    // Years of benefits from claiming age to median lifespan (never negative).
    const yearsOfBenefits = Math.max(0, medianLifespan - claimingAge);
    const lifetimeTotal = Math.round(annualBenefit * yearsOfBenefits);

    const coverageRatio = round2(annualBenefit / localAnnualCost);
    const annualShortfall = Math.max(0, localAnnualCost - annualBenefit);
    const requiredPortfolioGap = Math.round(annualShortfall * 25); // 4% rule

    const meetsVisaIncome = visaMin === undefined ? true : monthlyBenefit >= visaMin;

    return {
      claimingAge,
      monthlyBenefit,
      annualBenefit,
      lifetimeTotal,
      coverageRatio,
      requiredPortfolioGap,
      meetsVisaIncome,
    };
  });

  // Recommended age = the one that maximizes nominal lifetime SS dollars at the
  // median lifespan. This naturally picks 70 when you outlive the break-even and
  // 62 when you do not. NOTE: it maximizes expected SS cash only — it does not
  // weigh sequence-of-returns risk, portfolio/legacy goals, or spousal benefits.
  let best = scenarios[0];
  for (const s of scenarios) {
    if (s.lifetimeTotal > best.lifetimeTotal) best = s;
  }

  return {
    scenarios,
    breakEvenAge62vs70: breakEvenAge62vs70(fraBenefit),
    recommendedClaimingAge: best.claimingAge,
    recommendedScenario: best,
    localAnnualCost,
  };
}

/**
 * ss-engine.ts
 * -------------------------------------------------------------------------
 * Lifetime SS — Social Security claiming + geo-arbitrage math.
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
  // ── Hard-filter fields (Feature 1) ─────────────────────────────────────
  /** Annual mean PM2.5 concentration (µg/m³) for the target area.
   *  WHO 2021 guideline: 5 µg/m³; IT-1: 35 µg/m³.
   *  Source + lastVerified comment on each entry. */
  airQualityPM25: number;
  /** True if a Class-A private specialty hospital is ≤ 30 min from the target area. */
  hospitalClassAWithin30min: boolean;
  /** Reliable broadband speed (Mbps) typical for the target area. */
  internetMbps: number;
  /** True if an international airport is ≤ 1 hour from the target area. */
  airportWithin1hr: boolean;
  /** True if the location's tax regime is net-favorable for US SS and pension income. */
  taxFriendlyToPension: boolean;
  /** Passport group IDs that grant right of abode / free movement at this location.
   *  e.g., ['eu-eea'] for EU/EEA passport holders; ['oci'] for OCI card holders.
   *  Undefined / empty = no right-of-abode pathway exists. */
  passportGroupsWithAbode?: string[];
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
    airQualityPM25: 9,                  // lastVerified: 2026-08; source: EPA AQI Annual Summary 2024 Texas metros
    hospitalClassAWithin30min: true,  // major metro areas; Texas Medical Center (Houston), UT Southwestern (Dallas)
    internetMbps: 300,              // AT&T Fiber / Xfinity widely available in TX metros
    airportWithin1hr: true,         // DFW, Austin-Bergstrom, IAH all serve target areas
    taxFriendlyToPension: true,     // no state income tax on SS or pension income
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
    airQualityPM25: 7,                  // lastVerified: 2026-08; source: EPA AQI Annual Summary 2024 FL metros
    hospitalClassAWithin30min: true,  // Tampa General, AdventHealth, Orlando Health, Mayo Clinic FL
    internetMbps: 300,              // Spectrum / Xfinity fiber widely available
    airportWithin1hr: true,         // TPA, MCO, FLL, MIA serve target areas
    taxFriendlyToPension: true,     // no state income tax on SS or pension income
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
    airQualityPM25: 15,                 // lastVerified: 2026-08; source: IQAir Mérida 2024 annual avg
    hospitalClassAWithin30min: true,  // Centro Médico de las Américas, Star Médica Mérida
    internetMbps: 50,               // Telmex Infinitum fiber expanding in Mérida; typical 40–80 Mbps
    airportWithin1hr: true,         // Manuel Crescencio Rejón Intl ~15 min from centro
    taxFriendlyToPension: true,     // US–Mexico treaty; SS taxed only by the US
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
    airQualityPM25: 10,                 // lastVerified: 2026-08; source: EEA Air Quality Report 2024 Portugal
    hospitalClassAWithin30min: true,  // CUF Descobertas (Lisbon), Hospital Lusíadas, Hospital da Luz
    internetMbps: 300,              // NOS/MEO FTTH; Portugal ranks top-5 in EU for fiber penetration
    airportWithin1hr: true,         // Lisbon Humberto Delgado, Porto Francisco Sá Carneiro
    taxFriendlyToPension: false,    // worldwide income tax; NHR flat-rate regime closed March 2025
    passportGroupsWithAbode: ['eu-eea'], // EU/EEA passport holders have right of free movement and residence
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
    airQualityPM25: 14,                 // lastVerified: 2026-08; source: IQAir San José 2024 annual avg
    hospitalClassAWithin30min: true,  // CIMA Hospital, Clínica Bíblica, Hospital La Católica (San José metro)
    internetMbps: 60,               // ICE/Kolbi / cable ISPs; typical 40–100 Mbps in San José area
    airportWithin1hr: true,         // Juan Santamaría Intl ~20 min from San José
    taxFriendlyToPension: true,     // territorial; US SS and pension income not taxed locally
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
    airQualityPM25: 14,                 // lastVerified: 2026-08; source: IQAir Panama City 2024 annual avg
    hospitalClassAWithin30min: true,  // Hospital Punta Pacífica (JHI affiliate), Hospital Nacional, Clínica Hospital San Fernando
    internetMbps: 80,               // Cable & Wireless / Claro; typical 50–120 Mbps in Panama City
    airportWithin1hr: true,         // Tocumen Intl ~25 min from Marbella/El Cangrejo
    taxFriendlyToPension: true,     // territorial + USD economy + Pensionado pension discounts
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
    airQualityPM25: 11,                 // lastVerified: 2026-08; source: EEA Air Quality Report 2024 Spain
    hospitalClassAWithin30min: true,  // Hospital La Fe Valencia, Hospital General Universitario Alicante
    internetMbps: 300,              // Movistar / Orange FTTH; Spain top-3 EU for fiber penetration
    airportWithin1hr: true,         // Valencia Airport, Alicante-Elche Airport
    taxFriendlyToPension: false,    // worldwide income tax; no major SS exemption
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
    airQualityPM25: 13,                 // lastVerified: 2026-08; source: ARPA Sicilia / ARPA Calabria 2024 annual avg
    hospitalClassAWithin30min: false, // small qualifying towns (pop < 20k) often 45–60 min from nearest major hospital; Policlinico di Catanzaro, A.O.U. Policlinico di Palermo are ≥ 30 min from target villages
    internetMbps: 30,               // rural southern Italy FTTC/VDSL; ~20–50 Mbps typical; FTTH rare outside cities
    airportWithin1hr: true,         // Catania Fontanarossa, Palermo Falcone-Borsellino, Lamezia Terme Intl
    taxFriendlyToPension: true,     // 7% flat-rate scheme for qualifying retirees in towns < 20k (10-year cap)
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
    airQualityPM25: 22,                 // lastVerified: 2026-08; source: IQAir Medellín 2024 annual avg; valley geography traps pollution
    hospitalClassAWithin30min: true,  // Clínica Las Américas, Clínica del Campestre, Clínica CES (El Poblado / Laureles area)
    internetMbps: 100,              // Claro / EPM Telecomunicaciones fiber in El Poblado and Laureles
    airportWithin1hr: true,         // José María Córdova Intl ~45 min from El Poblado
    taxFriendlyToPension: true,     // 2024 reform (Ley 2277) largely exempts foreign pension income from Colombian tax
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
    airQualityPM25: 11,                 // lastVerified: 2026-08; source: Atmo PACA 2024 annual report (Provence / Côte d'Azur)
    hospitalClassAWithin30min: true,  // CHU de Nice, Hôpital de la Timone Marseille, Clinique Rambot Aix-en-Provence
    internetMbps: 200,              // Orange / SFR FTTH widely available in Provence/PACA region
    airportWithin1hr: true,         // Nice Côte d'Azur, Marseille Provence
    taxFriendlyToPension: false,    // worldwide income tax; US–France treaty but still taxable at French rates
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
    airQualityPM25: 27,                 // lastVerified: 2026-08; source: IQAir Kuala Lumpur 2024 annual avg; transboundary haze Jun–Oct spikes significantly
    hospitalClassAWithin30min: true,  // Gleneagles KL, Pantai Hospital Kuala Lumpur, Prince Court Medical Centre
    internetMbps: 200,              // Unifi (TM) FTTH widely available in KL metro; among fastest in SEA
    airportWithin1hr: true,         // KLIA / klia2 ~35–45 min from KL Sentral
    taxFriendlyToPension: true,     // territorial; foreign income (incl. US SS and pension) largely untaxed in Malaysia
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
    airQualityPM25: 38,                 // lastVerified: 2026-08; source: IQAir Chiang Mai 2024 annual avg; severe burning season Feb–Apr regularly exceeds WHO IT-1 (35 µg/m³)
    hospitalClassAWithin30min: true,  // Chiang Mai Ram Hospital, Bangkok Hospital Chiang Mai, Maharaj Nakorn Chiang Mai Hospital
    internetMbps: 100,              // AIS / TRUE fiber available in urban Chiang Mai
    airportWithin1hr: true,         // Chiang Mai Intl Airport ~10 min from Nimman / Old City area
    taxFriendlyToPension: true,     // territorial; foreign income untaxed if not remitted in same tax year
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

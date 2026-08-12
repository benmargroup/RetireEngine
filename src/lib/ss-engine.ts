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
 * FEATURE 5 EXTENSION (2026-08):
 *   - Added monthlyRatings (12-month go/shoulder/avoid climate/hazard grid) to
 *     all 10 expat LocationData entries. Seeded from public climate/hazard data
 *     (hurricane seasons, monsoon patterns, PM2.5 burn seasons, extreme heat).
 *   - Added getBestMonthsForLocation() helper for future Orbit engine use.
 *
 * FEATURE 6 EXTENSION (2026-08):
 *   - Added localCurrency, usdRelationship, fxVolatilityBand to all 10 expat
 *     LocationData entries. Disclosure-only — never forecasts exchange rates.
 *
 * FEATURE 3/4 COUNTRY EXPANSION (2026-08):
 *   - Added India (Goa), Vietnam (Da Nang), Sri Lanka (Colombo) to LOCATIONS.
 *     Data sourced/approved via Sabu — see per-field lastVerified comments.
 *   - Added TouristEntryRules type + touristEntry field (Feature 4 Orbit data).
 *   - Added orbitOnly flag: true = no residency visa path exists for anyone
 *     (Vietnam, Sri Lanka); false = a passport-based path may still exist
 *     even without a standard visa (India, via OCI right of abode).
 *   - NOTE: these 3 countries are NOT yet added to COUNTRY_PROFILES in
 *     scoring-engine.ts, so they do not appear in today's Anchor-mode
 *     rankings. They activate once Feature 4 (Orbit) is built.
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

/** Feature 5: one month's climate/hazard rating for a location. */
export type MonthRatingValue = 'go' | 'shoulder' | 'avoid';

export interface MonthRating {
  /** 1 = January ... 12 = December. */
  month: number;
  rating: MonthRatingValue;
  /** Short human-readable reasons shown on hover in <SeasonHeatmap>. */
  reasons: string[];
}

/** Feature 6: how a location's local currency relates to the US dollar. */
export type UsdRelationship = 'usd' | 'pegged' | 'floating';
/** Feature 6: qualitative FX volatility band for the local currency vs. USD. */
export type FxVolatilityBand = 'none' | 'low' | 'moderate' | 'high';

/** Feature 4: tourist entry rules for US citizens, used by the future Orbit
 *  Strategy Engine. Applies to orbitOnly destinations and any location a
 *  user might visit on a tourist basis between anchor stays. */
export interface TouristEntryRules {
  /** True if a US passport holder can enter visa-free or via electronic/on-arrival authorization. */
  visaFreeOrETA: boolean;
  /** Days allowed on the initial stamp/ETA before any in-country extension. */
  initialStayDays: number;
  /** Hard maximum days per visit after any allowed extension. */
  extendableToDays: number;
  /** Approximate per-entry fee for ETA/e-Visa, USD. 0 if free. */
  entryFeeUSD: number;
  /** One-sentence entry-rule summary for display in Orbit itinerary cards. */
  note: string;
}

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
  /** Expat only: minimum MONTHLY income to qualify via the income route, USD.
   *  Undefined = no such visa exists at all (not the same as a $0 threshold). */
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
  /** Feature 5: 12-month climate/hazard rating grid. Undefined for US states
   *  (seasonality is a lesser concern domestically; scope limited to expat locations). */
  monthlyRatings?: MonthRating[];
  /** Feature 6: local currency display name, e.g. 'Mexican Peso (MXN)'. */
  localCurrency?: string;
  /** Feature 6: how the local currency relates to USD. */
  usdRelationship?: UsdRelationship;
  /** Feature 6: qualitative FX volatility band vs. USD. Disclosure only — never forecasts rates. */
  fxVolatilityBand?: FxVolatilityBand;
  /** Feature 4: tourist entry/extension rules for US citizens. Populated for
   *  orbitOnly destinations and any location relevant to Orbit itineraries. */
  touristEntry?: TouristEntryRules;
  /** Feature 4: true if NO residency visa path exists for anyone (Vietnam,
   *  Sri Lanka). False (or undefined) even if the standard visa route is
   *  absent, as long as a passport-based path exists for some users (e.g.
   *  India — no visa for most, but OCI holders have real right of abode). */
  orbitOnly?: boolean;
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
    monthlyRatings: [ // lastVerified: 2026-08; source: NOAA Atlantic Hurricane Outlook, Yucatán climate normals
      { month: 1, rating: 'go', reasons: ['Dry season, comfortable temperatures'] },
      { month: 2, rating: 'go', reasons: ['Dry, warm, pleasant'] },
      { month: 3, rating: 'go', reasons: ['Dry season continues, warming'] },
      { month: 4, rating: 'shoulder', reasons: ['Hot, dry — pre-rainy-season heat spike'] },
      { month: 5, rating: 'shoulder', reasons: ['Very hot, humidity building'] },
      { month: 6, rating: 'avoid', reasons: ['Hurricane season begins', 'High heat and humidity'] },
      { month: 7, rating: 'avoid', reasons: ['Peak heat and humidity'] },
      { month: 8, rating: 'avoid', reasons: ['Hurricane season, high heat/humidity'] },
      { month: 9, rating: 'avoid', reasons: ['Peak Atlantic hurricane season'] },
      { month: 10, rating: 'avoid', reasons: ['Hurricane risk remains high'] },
      { month: 11, rating: 'shoulder', reasons: ['Hurricane season ending, rain decreasing'] },
      { month: 12, rating: 'go', reasons: ['Dry season begins, comfortable'] },
    ],
    localCurrency: 'Mexican Peso (MXN)', // lastVerified: 2026-08; source: Banco de México
    usdRelationship: 'floating',
    fxVolatilityBand: 'moderate',
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
    monthlyRatings: [ // lastVerified: 2026-08; source: IPMA (Portuguese Institute for Sea and Atmosphere) climate normals
      { month: 1, rating: 'shoulder', reasons: ['Cool, rainy — Atlantic winter storms'] },
      { month: 2, rating: 'shoulder', reasons: ['Cool, rainy season continues'] },
      { month: 3, rating: 'go', reasons: ['Mild temperatures, fewer crowds'] },
      { month: 4, rating: 'go', reasons: ['Pleasant spring weather'] },
      { month: 5, rating: 'go', reasons: ['Warm, dry, ideal conditions'] },
      { month: 6, rating: 'go', reasons: ['Warm, low rain, before peak tourist season'] },
      { month: 7, rating: 'shoulder', reasons: ['Peak heat inland; coastal areas still comfortable'] },
      { month: 8, rating: 'shoulder', reasons: ['Hottest month', 'Wildfire risk in interior regions'] },
      { month: 9, rating: 'go', reasons: ['Warm, drier, tourist crowds thinning'] },
      { month: 10, rating: 'go', reasons: ['Mild, comfortable, harvest season'] },
      { month: 11, rating: 'shoulder', reasons: ['Rain increasing, cooler'] },
      { month: 12, rating: 'shoulder', reasons: ['Wet Atlantic winter'] },
    ],
    localCurrency: 'Euro (EUR)', // lastVerified: 2026-08; source: European Central Bank
    usdRelationship: 'floating',
    fxVolatilityBand: 'low',
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
    monthlyRatings: [ // lastVerified: 2026-08; source: IMN (Costa Rica Instituto Meteorológico Nacional) climate normals
      { month: 1, rating: 'go', reasons: ['Dry season'] },
      { month: 2, rating: 'go', reasons: ['Dry season, ideal conditions'] },
      { month: 3, rating: 'go', reasons: ['Dry season, hottest but dry'] },
      { month: 4, rating: 'shoulder', reasons: ['Transition — rains beginning'] },
      { month: 5, rating: 'shoulder', reasons: ['Rainy season starts'] },
      { month: 6, rating: 'avoid', reasons: ['Consistent daily rains'] },
      { month: 7, rating: 'shoulder', reasons: ['Brief mid-season dry spell (veranillo) possible'] },
      { month: 8, rating: 'avoid', reasons: ['Rainy season continues'] },
      { month: 9, rating: 'avoid', reasons: ['Heavy rain'] },
      { month: 10, rating: 'avoid', reasons: ['Peak rainfall, flooding risk'] },
      { month: 11, rating: 'shoulder', reasons: ['Rains decreasing'] },
      { month: 12, rating: 'go', reasons: ['Dry season returns'] },
    ],
    localCurrency: 'Costa Rican Colón (CRC)', // lastVerified: 2026-08; source: Banco Central de Costa Rica
    usdRelationship: 'floating',
    fxVolatilityBand: 'moderate',
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
    monthlyRatings: [ // lastVerified: 2026-08; source: ETESA (Panama meteorological/hydrological authority) climate normals
      { month: 1, rating: 'go', reasons: ['Dry season, sunny'] },
      { month: 2, rating: 'go', reasons: ['Dry season, best conditions'] },
      { month: 3, rating: 'go', reasons: ['Dry season continues'] },
      { month: 4, rating: 'shoulder', reasons: ['Transition — rains beginning'] },
      { month: 5, rating: 'shoulder', reasons: ['Rainy season starts'] },
      { month: 6, rating: 'avoid', reasons: ['Heavy daily rains'] },
      { month: 7, rating: 'shoulder', reasons: ['Brief mid-season dry spell (veranillo) possible'] },
      { month: 8, rating: 'avoid', reasons: ['Rainy season continues'] },
      { month: 9, rating: 'avoid', reasons: ['Heavy rain'] },
      { month: 10, rating: 'avoid', reasons: ['Peak rainy season, heaviest rainfall'] },
      { month: 11, rating: 'shoulder', reasons: ['Rains tapering off'] },
      { month: 12, rating: 'go', reasons: ['Dry season returns'] },
    ],
    localCurrency: 'US Dollar (USD)', // lastVerified: 2026-08; source: Panama uses USD as legal tender alongside the Balboa
    usdRelationship: 'usd',
    fxVolatilityBand: 'none',
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
    passportGroupsWithAbode: ['eu-eea'], // EU/EEA passport holders have right of free movement and residence
    monthlyRatings: [ // lastVerified: 2026-08; source: AEMET (Spanish State Meteorological Agency) climate normals, Valencia/Alicante
      { month: 1, rating: 'shoulder', reasons: ['Cool, mild winter'] },
      { month: 2, rating: 'shoulder', reasons: ['Cool, occasional rain'] },
      { month: 3, rating: 'go', reasons: ['Mild spring weather begins'] },
      { month: 4, rating: 'go', reasons: ['Pleasant spring'] },
      { month: 5, rating: 'go', reasons: ['Warm, ideal conditions'] },
      { month: 6, rating: 'go', reasons: ['Warm, dry, before peak heat'] },
      { month: 7, rating: 'avoid', reasons: ['Extreme heat, especially inland/south'] },
      { month: 8, rating: 'avoid', reasons: ['Peak summer heat, crowded'] },
      { month: 9, rating: 'go', reasons: ['Warm, crowds thinning'] },
      { month: 10, rating: 'go', reasons: ['Mild, pleasant'] },
      { month: 11, rating: 'shoulder', reasons: ['Cooling, more rain'] },
      { month: 12, rating: 'shoulder', reasons: ['Mild winter'] },
    ],
    localCurrency: 'Euro (EUR)', // lastVerified: 2026-08; source: European Central Bank
    usdRelationship: 'floating',
    fxVolatilityBand: 'low',
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
    passportGroupsWithAbode: ['eu-eea'], // EU/EEA passport holders have right of free movement and residence
    monthlyRatings: [ // lastVerified: 2026-08; source: Servizio Meteorologico dell'Aeronautica Militare, southern Italy climate normals
      { month: 1, rating: 'shoulder', reasons: ['Mild but rainy winter'] },
      { month: 2, rating: 'shoulder', reasons: ['Cool, some rain'] },
      { month: 3, rating: 'go', reasons: ['Mild spring begins'] },
      { month: 4, rating: 'go', reasons: ['Pleasant, blooming season'] },
      { month: 5, rating: 'go', reasons: ['Warm, ideal'] },
      { month: 6, rating: 'go', reasons: ['Warm, dry'] },
      { month: 7, rating: 'avoid', reasons: ['Intense heat, especially inland Sicily/Calabria'] },
      { month: 8, rating: 'avoid', reasons: ['Peak heat', 'Many locals on holiday'] },
      { month: 9, rating: 'go', reasons: ['Warm, less crowded'] },
      { month: 10, rating: 'go', reasons: ['Mild, harvest season'] },
      { month: 11, rating: 'shoulder', reasons: ['Rain increasing'] },
      { month: 12, rating: 'shoulder', reasons: ['Mild, wetter winter'] },
    ],
    localCurrency: 'Euro (EUR)', // lastVerified: 2026-08; source: European Central Bank
    usdRelationship: 'floating',
    fxVolatilityBand: 'low',
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
    monthlyRatings: [ // lastVerified: 2026-08; source: IDEAM (Colombia meteorological institute) Medellín climate normals; altitude (~4,900ft) keeps year-round temps mild
      { month: 1, rating: 'go', reasons: ['Dry, mild — one of the best months'] },
      { month: 2, rating: 'go', reasons: ['Dry season continues'] },
      { month: 3, rating: 'shoulder', reasons: ['Rain increasing'] },
      { month: 4, rating: 'shoulder', reasons: ['Wettest period of first rainy season'] },
      { month: 5, rating: 'shoulder', reasons: ['Rain continues'] },
      { month: 6, rating: 'go', reasons: ['Drier interlude'] },
      { month: 7, rating: 'go', reasons: ['Dry, pleasant'] },
      { month: 8, rating: 'go', reasons: ['Dry, windy — pleasant'] },
      { month: 9, rating: 'shoulder', reasons: ['Second rainy season begins'] },
      { month: 10, rating: 'shoulder', reasons: ['Wettest period of second rainy season'] },
      { month: 11, rating: 'shoulder', reasons: ['Rain continuing'] },
      { month: 12, rating: 'go', reasons: ['Drier, pleasant, holiday season'] },
    ],
    localCurrency: 'Colombian Peso (COP)', // lastVerified: 2026-08; source: Banco de la República (Colombia central bank)
    usdRelationship: 'floating',
    fxVolatilityBand: 'high',
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
    passportGroupsWithAbode: ['eu-eea'], // EU/EEA passport holders have right of free movement and residence
    monthlyRatings: [ // lastVerified: 2026-08; source: Météo-France PACA regional climate normals
      { month: 1, rating: 'shoulder', reasons: ['Cool, occasional Mistral winds'] },
      { month: 2, rating: 'shoulder', reasons: ['Cool, variable'] },
      { month: 3, rating: 'go', reasons: ['Mild spring begins'] },
      { month: 4, rating: 'go', reasons: ['Pleasant, lavender fields begin blooming'] },
      { month: 5, rating: 'go', reasons: ['Warm, ideal, fewer crowds'] },
      { month: 6, rating: 'go', reasons: ['Warm, dry, lavender season'] },
      { month: 7, rating: 'shoulder', reasons: ['Peak heat', 'Peak tourist crowds'] },
      { month: 8, rating: 'shoulder', reasons: ['Hottest month, very crowded'] },
      { month: 9, rating: 'go', reasons: ['Warm, crowds thinning, harvest season'] },
      { month: 10, rating: 'go', reasons: ['Mild, pleasant'] },
      { month: 11, rating: 'shoulder', reasons: ['Cooling, more rain, Mistral winds'] },
      { month: 12, rating: 'shoulder', reasons: ['Mild but cooler winter'] },
    ],
    localCurrency: 'Euro (EUR)', // lastVerified: 2026-08; source: European Central Bank
    usdRelationship: 'floating',
    fxVolatilityBand: 'low',
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
    monthlyRatings: [ // lastVerified: 2026-08; source: Malaysian Meteorological Department; ASEAN Specialised Meteorological Centre transboundary haze bulletins
      { month: 1, rating: 'shoulder', reasons: ['Inter-monsoon rain possible'] },
      { month: 2, rating: 'go', reasons: ['Relatively dry period'] },
      { month: 3, rating: 'shoulder', reasons: ['Inter-monsoon rains increasing'] },
      { month: 4, rating: 'shoulder', reasons: ['Inter-monsoon peak rainfall'] },
      { month: 5, rating: 'go', reasons: ['Drier interlude'] },
      { month: 6, rating: 'shoulder', reasons: ['Regional transboundary haze risk begins'] },
      { month: 7, rating: 'shoulder', reasons: ['Haze risk continues'] },
      { month: 8, rating: 'avoid', reasons: ['Peak transboundary haze season', 'PM2.5 spikes'] },
      { month: 9, rating: 'avoid', reasons: ['Haze season continues, air quality risk'] },
      { month: 10, rating: 'shoulder', reasons: ['Inter-monsoon rains increasing, haze risk tapering'] },
      { month: 11, rating: 'shoulder', reasons: ['Northeast monsoon rains beginning'] },
      { month: 12, rating: 'shoulder', reasons: ['Northeast monsoon rains'] },
    ],
    localCurrency: 'Malaysian Ringgit (MYR)', // lastVerified: 2026-08; source: Bank Negara Malaysia
    usdRelationship: 'floating',
    fxVolatilityBand: 'moderate',
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
    monthlyRatings: [ // lastVerified: 2026-08; source: Thai Meteorological Department; Chiang Mai burn-season PM2.5 data (IQAir, GISTDA)
      { month: 1, rating: 'go', reasons: ['Cool, dry season — best weather'] },
      { month: 2, rating: 'shoulder', reasons: ['Burn season beginning, air quality declining'] },
      { month: 3, rating: 'avoid', reasons: ['Peak burn season', 'Severe smoke/haze, PM2.5 very high'] },
      { month: 4, rating: 'avoid', reasons: ['Burn season continues, hottest month, poor air quality'] },
      { month: 5, rating: 'shoulder', reasons: ['Burn season ending, rains beginning'] },
      { month: 6, rating: 'shoulder', reasons: ['Rainy season begins'] },
      { month: 7, rating: 'shoulder', reasons: ['Rainy season continues'] },
      { month: 8, rating: 'shoulder', reasons: ['Rainy season, lush and green'] },
      { month: 9, rating: 'shoulder', reasons: ['Peak rainy season'] },
      { month: 10, rating: 'shoulder', reasons: ['Rains tapering off'] },
      { month: 11, rating: 'go', reasons: ['Cool season begins, clear air'] },
      { month: 12, rating: 'go', reasons: ['Cool, dry, clear air — ideal'] },
    ],
    localCurrency: 'Thai Baht (THB)', // lastVerified: 2026-08; source: Bank of Thailand
    usdRelationship: 'floating',
    fxVolatilityBand: 'moderate',
  },
  // ── Feature 3/4 country expansion (2026-08) ─────────────────────────────
  {
    id: 'india',
    label: 'India (Goa)',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1200,
    taxPosture: 'worldwide-income-tax',
    taxNote: 'OCI holders who stay < 182 days/yr in India are typically non-resident and not taxed on foreign income. Standard residents taxed on worldwide income. India–US DTAA applies. Requires licensed advisor to model correctly.',
    visaName: 'OCI Card / Long-Stay e-Visa',
    visaIncomeMinMonthly: undefined, // no standard retirement visa exists for non-OCI holders — see orbitOnly note below
    visaSavingsAlt: undefined,
    healthcareNote: 'Medicare not valid abroad. Private hospitals in Goa (Manipal, Apollo South Goa). Specialist care in Mumbai or Pune is ~1-hr flight and world-class.',
    monthlyBudgetCoupleLow: 2000,
    monthlyBudgetCoupleHigh: 3200, // lastVerified: 2026-08; source: Numbeo Goa, OCI retiree community reports
    airQualityPM25: 19,                 // lastVerified: 2026-08; source: IQAir Goa / Panaji 2024 annual avg; monsoon clears air Jun–Sep
    hospitalClassAWithin30min: true,  // Manipal Hospital Goa, Apollo Spectra Goa (Panaji/Margao area)
    internetMbps: 50,                // Jio Fiber / BSNL expanding; typical 30–80 Mbps in Goa urban areas
    airportWithin1hr: true,          // Mopa International (Goa) and Dabolim Airport
    taxFriendlyToPension: false,     // complex: OCI non-residents typically exempt, but requires professional advice
    passportGroupsWithAbode: ['oci'], // OCI card holders have right of abode; no retirement visa for all others
    orbitOnly: false, // OCI holders have a genuine residency path — not orbit-only for them
    monthlyRatings: [ // lastVerified: 2026-08; source: IMD Goa, Goa Tourism seasonal data
      { month: 1, rating: 'go', reasons: ['Dry season peak', 'Clear skies 80–85°F, perfect'] },
      { month: 2, rating: 'go', reasons: ['Dry season', 'Warm & clear 82–87°F'] },
      { month: 3, rating: 'shoulder', reasons: ['Heat building 85–90°F', 'Still manageable'] },
      { month: 4, rating: 'avoid', reasons: ['Extreme heat & humidity 90–95°F', 'Uncomfortable'] },
      { month: 5, rating: 'avoid', reasons: ['Pre-monsoon extreme heat', 'Many businesses closing'] },
      { month: 6, rating: 'avoid', reasons: ['Monsoon arrives', 'Very heavy rain, closures'] },
      { month: 7, rating: 'avoid', reasons: ['Peak monsoon', 'Flooding risk, tourism closed'] },
      { month: 8, rating: 'avoid', reasons: ['Heavy monsoon continues', 'Limited activities'] },
      { month: 9, rating: 'shoulder', reasons: ['Monsoon tapering', 'Still some rain, lush landscape'] },
      { month: 10, rating: 'shoulder', reasons: ['Post-monsoon', 'Green & scenic 85°F, some rain'] },
      { month: 11, rating: 'go', reasons: ['Dry season returns', 'Ideal 82–85°F'] },
      { month: 12, rating: 'go', reasons: ['Peak season', 'Christmas/NYE 78–82°F, perfect'] },
    ],
    localCurrency: 'Indian Rupee (INR)', // lastVerified: 2026-08; source: xe.com 5-yr history, Reserve Bank of India
    usdRelationship: 'floating', // INR floats with RBI intervention; 2020-2024 range ~73–84 INR/USD
    fxVolatilityBand: 'moderate', // steady ~3–5%/yr depreciation trend; relatively predictable but cumulative
    touristEntry: { // lastVerified: 2026-08; source: FRRO India, indianvisaonline.gov.in
      visaFreeOrETA: false,
      initialStayDays: 30,
      extendableToDays: 90,
      entryFeeUSD: 25,
      note: 'e-Tourist Visa: 30-day double-entry (~$25); 5-yr/10-yr multiple-entry tourist visa allows up to 180 days per stay. OCI holders: unlimited stay, no fee.',
    },
  },
  {
    id: 'vietnam',
    label: 'Vietnam (Da Nang)',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1200,
    taxPosture: 'territorial',
    taxNote: 'Territorial-like for tourist stays: foreign-sourced income not taxed in Vietnam for non-residents. US citizens still owe IRS on worldwide income regardless.',
    visaIncomeMinMonthly: undefined, // no residency visa path exists for anyone — orbit-only
    visaSavingsAlt: undefined,
    healthcareNote: 'Medicare not valid. Vinmec International Hospital Da Nang (JCI-accredited). International health cover essential.',
    monthlyBudgetCoupleLow: 1800,
    monthlyBudgetCoupleHigh: 2800, // lastVerified: 2026-08; source: Numbeo Da Nang, expat community reports
    airQualityPM25: 24,                // lastVerified: 2026-08; source: IQAir Da Nang 2024 annual avg
    hospitalClassAWithin30min: true,   // Vinmec Da Nang
    internetMbps: 80,                  // FPT Fiber, Viettel; typical 50–100 Mbps in Da Nang urban areas
    airportWithin1hr: true,            // Da Nang International Airport (DAD)
    taxFriendlyToPension: true,
    orbitOnly: true, // no residency visa path exists for anyone — tourist entry only
    monthlyRatings: [ // lastVerified: 2026-08; source: Vietnam National Administration of Tourism, weather.com.vn
      { month: 1, rating: 'go', reasons: ['Dry & sunny', 'Cool 68–77°F, ideal'] },
      { month: 2, rating: 'go', reasons: ['Best month', 'Dry, clear, 70–80°F'] },
      { month: 3, rating: 'go', reasons: ['Warm & dry', 'Beach season 75–84°F'] },
      { month: 4, rating: 'go', reasons: ['Hot & sunny', 'Great beach weather 80–88°F'] },
      { month: 5, rating: 'go', reasons: ['Start of summer', 'Hot 84–91°F, low rain'] },
      { month: 6, rating: 'shoulder', reasons: ['Hot & humid', 'Occasional rain 88–93°F'] },
      { month: 7, rating: 'avoid', reasons: ['Typhoon season begins', 'Heavy rain, storm risk'] },
      { month: 8, rating: 'avoid', reasons: ['Peak typhoon risk', 'Flooding, closures possible'] },
      { month: 9, rating: 'avoid', reasons: ['Typhoon season continues', 'Wet & stormy'] },
      { month: 10, rating: 'shoulder', reasons: ['Typhoon risk tapering', 'Rainy but calming'] },
      { month: 11, rating: 'go', reasons: ['Cooler & drier', 'Good weather returning 72–80°F'] },
      { month: 12, rating: 'go', reasons: ['Dry season starts', 'Clear, mild 65–75°F'] },
    ],
    localCurrency: 'Vietnamese Dong (VND)', // lastVerified: 2026-08; source: xe.com 5-yr history, State Bank of Vietnam
    usdRelationship: 'floating', // VND is tightly managed by SBV; 2020-2024 range ~23,000–25,500 VND/USD
    fxVolatilityBand: 'low', // SBV maintains tight band; USD widely accepted in Da Nang tourist economy
    touristEntry: { // lastVerified: 2026-08; source: evisa.xuatnhapcanh.gov.vn
      visaFreeOrETA: false,
      initialStayDays: 90,
      extendableToDays: 90,
      entryFeeUSD: 25,
      note: '90-day e-Visa for US citizens; multiple-entry; must exit and re-apply from outside Vietnam to renew.',
    },
  },
  {
    id: 'sri-lanka',
    label: 'Sri Lanka (Colombo)',
    kind: 'expat',
    currency: 'USD',
    monthlyComfortableCost: 1000,
    taxPosture: 'territorial',
    taxNote: 'Foreign-sourced income not taxed for non-residents. US citizens still owe IRS on worldwide income regardless of time abroad.',
    visaIncomeMinMonthly: undefined, // no residency visa path exists for anyone — orbit-only
    visaSavingsAlt: undefined,
    healthcareNote: 'Medicare not valid. Lanka Hospitals, Nawaloka, and Asiri group hospitals in Colombo offer near-Western quality. International cover essential.',
    monthlyBudgetCoupleLow: 1400,
    monthlyBudgetCoupleHigh: 2200, // lastVerified: 2026-08; source: Numbeo Colombo, expat forums
    airQualityPM25: 14,                // lastVerified: 2026-08; source: IQAir Colombo 2024 annual avg
    hospitalClassAWithin30min: true,   // Lanka Hospitals, Nawaloka in Colombo
    internetMbps: 40,                  // Dialog, SLT fiber; typical 20–60 Mbps in Colombo
    airportWithin1hr: true,            // Bandaranaike International Airport (CMB), ~30 min from Colombo
    taxFriendlyToPension: true,
    orbitOnly: true, // no residency visa path exists for anyone — tourist entry only
    monthlyRatings: [ // lastVerified: 2026-08; source: Sri Lanka Meteorology Dept, seasonal travel guides
      { month: 1, rating: 'go', reasons: ['NE monsoon end', 'Dry & warm 79–88°F, excellent'] },
      { month: 2, rating: 'go', reasons: ['Best weather', 'Clear skies, low humidity'] },
      { month: 3, rating: 'go', reasons: ['Warm & sunny', 'Inter-monsoon 82–90°F'] },
      { month: 4, rating: 'shoulder', reasons: ['Inter-monsoon showers', 'Hot & humid, periodic rain'] },
      { month: 5, rating: 'avoid', reasons: ['SW monsoon arrives', 'Heavy rain in west & south'] },
      { month: 6, rating: 'avoid', reasons: ['SW monsoon peak', 'Flooding risk in Colombo'] },
      { month: 7, rating: 'avoid', reasons: ['Heavy rain continues', 'Colombo west coast affected'] },
      { month: 8, rating: 'avoid', reasons: ['SW monsoon continues', 'Overcast, frequent downpours'] },
      { month: 9, rating: 'shoulder', reasons: ['Monsoon tapering', 'Still some rain, cheaper rates'] },
      { month: 10, rating: 'shoulder', reasons: ['Inter-monsoon', 'Variable weather, occasional storms'] },
      { month: 11, rating: 'shoulder', reasons: ['NE monsoon starts', 'East coast now wet, west drying'] },
      { month: 12, rating: 'go', reasons: ['West coast clears', 'Dry & pleasant 78–85°F'] },
    ],
    localCurrency: 'Sri Lankan Rupee (LKR)', // lastVerified: 2026-08; source: xe.com 5-yr history, Central Bank of Sri Lanka
    usdRelationship: 'floating', // LKR floats; 2022 currency crisis — LKR lost ~45% vs USD; 2024: ~300 LKR/USD
    fxVolatilityBand: 'high', // post-crisis managed float; ongoing IMF program reduces but does not eliminate risk
    touristEntry: { // lastVerified: 2026-08; source: eta.gov.lk
      visaFreeOrETA: false,
      initialStayDays: 30,
      extendableToDays: 270,
      entryFeeUSD: 40,
      note: 'ETA required ($40): 30 days initial; extendable in-country up to 270 days total (via Department of Immigration, Colombo).',
    },
  },
];

/** Look up a location by id; returns undefined if not found. */
export function getLocation(id: string): LocationData | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

/**
 * Feature 5 helper: returns the list of 'go' months (1–12) for a location,
 * for use by the Orbit engine (Feature 4) and any UI needing a quick summary.
 * Returns an empty array if the location has no monthlyRatings data.
 */
export function getBestMonthsForLocation(locationId: string): number[] {
  const location = getLocation(locationId);
  if (!location?.monthlyRatings) return [];
  return location.monthlyRatings
    .filter((m) => m.rating === 'go')
    .map((m) => m.month);
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
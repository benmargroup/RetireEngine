/**
 * scoring-engine.ts
 * -------------------------------------------------------------------------
 * Subjective country profiles ONLY. All financial/visa/budget/tax figures
 * are read from LOCATIONS in ss-engine.ts — never duplicated here.
 *
 * Architecture rule (enforced by compile-time guard below):
 *   Every id in COUNTRY_PROFILES must exist in LOCATIONS as kind === 'expat'.
 *   Build fails if a profile id is orphaned.
 * -------------------------------------------------------------------------
 */

import { LOCATIONS, getLocation } from './ss-engine';
import type { LocationData } from './ss-engine';
import type { Step3Data, CountryScore, QualificationStatus, NonNegotiables, PassportProfile, AccessLevel } from '@/types/assessment';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CountryProfile {
  id: string; // MUST match a LocationData.id where kind === 'expat'
  flag: string;
  criteria: {
    healthcare: number;
    climate: number;
    language: number;
    proximity: number;
    safety: number;
    cost: number;
    expatCommunity: number;
    infrastructure: number;
    culture: number;
    banking: number; // each 1–10
  };
  climateType: 'mediterranean' | 'tropical' | 'four_seasons' | 'mild';
  honestReality: string; // "What They Don't Tell You"
  strengths: string[]; // top 3
}

// ── Country profiles (subjective criteria only) ────────────────────────────

export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  portugal: {
    id: 'portugal',
    flag: '🇵🇹',
    criteria: {
      healthcare: 8, climate: 8, language: 6, proximity: 5, safety: 9,
      cost: 7, expatCommunity: 9, infrastructure: 7, culture: 9, banking: 6,
    },
    climateType: 'mediterranean',
    honestReality: 'The NHR tax program ended March 2025. Bureaucracy is genuinely slow and costs have risen 40% since 2021. Despite this, Portugal remains one of the safest, most livable countries in Europe — enter with updated expectations rather than the 2018 hype.',
    strengths: ['Safety & Political Stability', 'World-Class Healthcare', 'Largest US Expat Community in Europe'],
  },
  mexico: {
    id: 'mexico',
    flag: '🇲🇽',
    criteria: {
      healthcare: 6, climate: 7, language: 5, proximity: 10, safety: 5,
      cost: 9, expatCommunity: 8, infrastructure: 6, culture: 8, banking: 6,
    },
    climateType: 'tropical',
    honestReality: 'Mérida is safe, colonial, and culturally rich — 3-hour flights to the US. The income threshold ($4,300/mo) is high but the savings route ($73k) is accessible for most retirees. US–Mexico tax treaty keeps SS taxed by the US only — no local tax surprise.',
    strengths: ['Closest to the USA (3-hr flights)', 'Lowest Cost of Living', 'US–Mexico Tax Treaty on SS'],
  },
  panama: {
    id: 'panama',
    flag: '🇵🇦',
    criteria: {
      healthcare: 7, climate: 6, language: 6, proximity: 9, safety: 6,
      cost: 8, expatCommunity: 9, infrastructure: 7, culture: 6, banking: 9,
    },
    climateType: 'tropical',
    honestReality: 'USD economy eliminates currency risk. Territorial tax means no local tax on foreign income including SS. Banking infrastructure rivals Miami. Panama City is genuinely modern. Cultural depth is limited versus Europe, but financial advantages are substantial. Pensionado benefits (discounts on healthcare, utilities, entertainment) are real and valuable.',
    strengths: ['Territorial Tax (No Foreign Income Tax)', 'World-Class Banking', 'USD Economy — No Currency Risk'],
  },
  'costa-rica': {
    id: 'costa-rica',
    flag: '🇨🇷',
    criteria: {
      healthcare: 7, climate: 7, language: 5, proximity: 8, safety: 7,
      cost: 7, expatCommunity: 9, infrastructure: 6, culture: 7, banking: 6,
    },
    climateType: 'tropical',
    honestReality: 'Costa Rica has the largest, most established American expat community in Latin America. Infrastructure outside San José can be genuinely challenging — roads, internet, and utilities vary significantly by region. Public CAJA healthcare is mandatory but private supplement keeps quality high in major areas.',
    strengths: ['Largest US Expat Community in Latin America', 'Natural Beauty & Biodiversity', 'Strong Political Stability'],
  },
  spain: {
    id: 'spain',
    flag: '🇪🇸',
    criteria: {
      healthcare: 9, climate: 8, language: 5, proximity: 5, safety: 8,
      cost: 6, expatCommunity: 8, infrastructure: 8, culture: 10, banking: 6,
    },
    climateType: 'mediterranean',
    honestReality: 'Spain has one of the best healthcare systems in the world. Costs vary dramatically — Valencia and Alicante offer the same quality as Madrid at 35% less. Spain taxes worldwide income, so model the tax drag before committing. The Non-Lucrative Visa income threshold ($2,600/mo) is achievable but firm.',
    strengths: ['Top-5 Healthcare System Globally', 'Exceptional Infrastructure', 'Unmatched Cultural Richness'],
  },
  italy: {
    id: 'italy',
    flag: '🇮🇹',
    criteria: {
      healthcare: 8, climate: 8, language: 4, proximity: 5, safety: 7,
      cost: 6, expatCommunity: 7, infrastructure: 6, culture: 10, banking: 5,
    },
    climateType: 'mediterranean',
    honestReality: 'Italy\'s 7% flat-tax program for retirees in qualifying southern towns is genuinely compelling — 7% on all foreign income for 10 years. Calabria, Sicily, and Puglia offer extraordinary lifestyle at lower cost. Italian bureaucracy is infamous. Without the flat-tax program, Italy\'s worldwide income tax becomes the highest drag on this list.',
    strengths: ['7% Flat Tax Program (10 Years)', 'Unmatched Culture & Cuisine', 'Mediterranean Climate'],
  },
  colombia: {
    id: 'colombia',
    flag: '🇨🇴',
    criteria: {
      healthcare: 7, climate: 9, language: 4, proximity: 8, safety: 6,
      cost: 9, expatCommunity: 7, infrastructure: 7, culture: 8, banking: 5,
    },
    climateType: 'mild',
    honestReality: 'Medellín\'s 72°F year-round climate is real and remarkable. El Poblado and Laureles are genuinely safe with thriving expat communities. Private hospitals are excellent and affordable ($30–80 specialist visits). Safety concerns exist in other parts of the city and country. The 2024 Colombian tax reform largely protects foreign pension income from local tax.',
    strengths: ['Eternal Spring Climate (72°F Year-Round)', 'Exceptional Healthcare Value', 'Low Visa Income Threshold'],
  },
  france: {
    id: 'france',
    flag: '🇫🇷',
    criteria: {
      healthcare: 9, climate: 7, language: 3, proximity: 5, safety: 7,
      cost: 5, expatCommunity: 7, infrastructure: 9, culture: 10, banking: 6,
    },
    climateType: 'mediterranean', // Provence specifically
    honestReality: 'France offers world-class healthcare, extraordinary culture, and remarkable regional diversity at a premium price. Language matters far more here than in Spain or Portugal — French is genuinely required for daily life. The Long-Stay Visitor visa has no fixed income floor; documentation quality matters. Worldwide income tax requires careful modeling.',
    strengths: ['World-Class Healthcare (#1 WHO Ranking)', 'Unsurpassed Cultural Richness', 'TGV Rail Access Across Europe'],
  },
  malaysia: {
    id: 'malaysia',
    flag: '🇲🇾',
    criteria: {
      healthcare: 9, climate: 5, language: 9, proximity: 3, safety: 8,
      cost: 8, expatCommunity: 8, infrastructure: 8, culture: 8, banking: 7,
    },
    climateType: 'tropical',
    honestReality: 'Malaysia offers the best healthcare-to-cost ratio in the world. Kuala Lumpur\'s infrastructure rivals Singapore at 30–40% lower cost. English is widely spoken. However, MM2H Silver requires a fixed deposit AND offshore income AND a property purchase — not a simple threshold. Heat and humidity are significant year-round.',
    strengths: ['Best Healthcare Value in the World', 'English Widely Spoken', 'Modern Infrastructure'],
  },
  thailand: {
    id: 'thailand',
    flag: '🇹🇭',
    criteria: {
      healthcare: 8, climate: 6, language: 4, proximity: 2, safety: 7,
      cost: 9, expatCommunity: 9, infrastructure: 7, culture: 9, banking: 5,
    },
    climateType: 'tropical',
    honestReality: 'Chiang Mai offers extraordinary value, a large English-speaking expat community, excellent food, and rich culture. Bangkok provides world-class private hospitals. Non-O-A requires annual renewal and mandatory health insurance. 20+ hour flights from the US make regular family visits expensive. Political situation has been periodically unstable.',
    strengths: ['Exceptional Cost of Living', 'Rich Cultural Experience', 'World-Class Hospital Care'],
  },
};

// ── Compile-time guard ─────────────────────────────────────────────────────
// Fails the build (throws at module load) if any profile id is missing from LOCATIONS.

const EXPAT_IDS = new Set(LOCATIONS.filter((l) => l.kind === 'expat').map((l) => l.id));
for (const id of Object.keys(COUNTRY_PROFILES)) {
  if (!EXPAT_IDS.has(id)) {
    throw new Error(
      `[scoring-engine] COUNTRY_PROFILES id "${id}" is not in LOCATIONS as kind==="expat". ` +
        `Add it to ss-engine.ts LOCATIONS before using it here.`,
    );
  }
}

// ── Climate matching ───────────────────────────────────────────────────────

const CLIMATE_MATCHES: Record<string, string[]> = {
  mediterranean: ['mediterranean'],
  tropical: ['tropical'],
  four_seasons: ['four_seasons'],
  mild: ['mild', 'mediterranean'],
};

// ── Scoring ────────────────────────────────────────────────────────────────

const CRITERIA = [
  'healthcare', 'climate', 'language', 'proximity', 'safety',
  'cost', 'expatCommunity', 'infrastructure', 'culture', 'banking',
] as const;
type Criterion = (typeof CRITERIA)[number];

const PRIORITY_KEY_MAP: Record<Criterion, keyof Omit<Step3Data, 'climatePreference' | 'hasHealthConditions' | 'nonNegotiables' | 'airQuality'>> = {
  healthcare: 'healthcare',
  climate: 'climate',
  language: 'language',
  proximity: 'proximity',
  safety: 'safety',
  cost: 'cost',
  expatCommunity: 'expatCommunity',
  infrastructure: 'infrastructure',
  culture: 'culture',
  banking: 'banking',
};

/** WHO IT-1 for annual mean PM2.5 (µg/m³). Countries above this fail the clean-air hard filter. */
const PM25_CLEAN_AIR_THRESHOLD = 35;

/** Map raw PM2.5 (µg/m³) to a 1–10 score using WHO AQI bands. */
function pm25ToScore(pm25: number): number {
  if (pm25 <= 5) return 10;
  if (pm25 <= 10) return 8;
  if (pm25 <= 15) return 6;
  if (pm25 <= 25) return 4;
  if (pm25 <= 35) return 2;
  return 1;
}

/** Human-readable band label for a PM2.5 value. */
function pm25ToBand(pm25: number): string {
  if (pm25 <= 5) return 'Excellent';
  if (pm25 <= 10) return 'Good';
  if (pm25 <= 15) return 'Fair';
  if (pm25 <= 25) return 'Moderate';
  if (pm25 <= 35) return 'Poor';
  return 'Unhealthy';
}

/** Minimum internet speed (Mbps) required when internet100 filter is active. */
const INTERNET_MBPS_THRESHOLD = 100;

/**
 * Evaluate which active hard filters a location fails.
 * Returns an array of human-readable labels for each failure.
 * Empty array = passes all active filters.
 */
function applyHardFilters(
  loc: LocationData,
  nn: NonNegotiables,
  budgetLow: number,
): string[] {
  const failures: string[] = [];

  if (nn.costCeiling && nn.costCeiling > 0 && budgetLow > nn.costCeiling) {
    failures.push(`Cost > $${nn.costCeiling.toLocaleString()}/mo`);
  }
  if (nn.hospitalWithin30min && !loc.hospitalClassAWithin30min) {
    failures.push('No Class-A hospital ≤ 30 min');
  }
  if (nn.cleanAir && loc.airQualityPM25 > PM25_CLEAN_AIR_THRESHOLD) {
    failures.push(`PM2.5 ${loc.airQualityPM25} µg/m³ (limit: ${PM25_CLEAN_AIR_THRESHOLD})`);
  }
  if (nn.internet100 && loc.internetMbps < INTERNET_MBPS_THRESHOLD) {
    failures.push(`Internet ${loc.internetMbps} Mbps (need ≥ ${INTERNET_MBPS_THRESHOLD})`);
  }
  if (nn.airportWithin1hr && !loc.airportWithin1hr) {
    failures.push('No intl airport ≤ 1 hr');
  }
  if (nn.taxFriendly && !loc.taxFriendlyToPension) {
    failures.push('Not tax-friendly to SS/pension');
  }

  return failures;
}

function buildVisaRequirementsNote(loc: LocationData): string {
  const income = loc.visaIncomeMinMonthly
    ? `$${loc.visaIncomeMinMonthly.toLocaleString()}/month income`
    : null;
  const savings = loc.visaSavingsAlt
    ? `$${loc.visaSavingsAlt.toLocaleString()} savings deposit`
    : null;
  let req = '';
  if (income && savings) req = `Requires ${income} OR ${savings}.`;
  else if (income) req = `Requires ${income}.`;
  else if (savings) req = `Requires ${savings}.`;
  return `${loc.visaName ?? 'Visa'}. ${req}`.trim();
}

/**
 * Derive a user's right-of-movement/residency access level for a given location.
 * A passport granting right of abode always wins, regardless of visa-income solvency —
 * that's a fundamentally different (and better) legal status than a retiree visa.
 */
function deriveAccessLevel(
  passportProfile: PassportProfile | undefined,
  location: LocationData,
  qualificationStatus: QualificationStatus,
): AccessLevel {
  const abodeGroups = location.passportGroupsWithAbode ?? [];
  const userGroups = passportProfile?.passports ?? [];
  const hasAbode = userGroups.some((g: string) => abodeGroups.includes(g));

  if (hasAbode) return 'resident-by-passport';
  if (qualificationStatus === 'income' || qualificationStatus === 'savings') return 'retiree-visa-eligible';
  return 'tourist-only';
}

export function calculateScores(
  priorities: Step3Data,
  totalMonthlyIncome: number,
  liquidAssets: number,
  nonNegotiables: NonNegotiables = {},
  passportProfile?: PassportProfile,
): CountryScore[] {
  // 10 profile criteria + 1 air-quality criterion = 11 slots × max score (10) × max priority (5)
  const MAX_POSSIBLE = (CRITERIA.length + 1) * 10 * 5; // 550

  return Object.values(COUNTRY_PROFILES)
    .map((profile) => {
      const location = getLocation(profile.id) as LocationData; // safe — guard above ensures presence

      // 1. Weighted base score (normalized 0–80)
      let weightedSum = 0;
      for (const criterion of CRITERIA) {
        const priorityKey = PRIORITY_KEY_MAP[criterion];
        let userPriority = priorities[priorityKey] as number;
        if (criterion === 'healthcare' && priorities.hasHealthConditions) {
          userPriority = Math.min(userPriority * 2, 10);
        }
        weightedSum += profile.criteria[criterion] * userPriority;
      }
      // Air quality — objective score from LOCATIONS, weighted by user's airQuality priority
      weightedSum += pm25ToScore(location.airQualityPM25) * priorities.airQuality;

      let score = (weightedSum / MAX_POSSIBLE) * 80;

      // 2. Passport-based abode check (must run before visa-solvency modifier)
      const abodeGroups = location.passportGroupsWithAbode ?? [];
      const userPassports = passportProfile?.passports ?? [];
      const hasAbode = userPassports.some((g: string) => abodeGroups.includes(g));

      // 3. Hard visa-solvency modifier — SKIPPED entirely for passport-based residents
      const visaIncomeMin = location.visaIncomeMinMonthly ?? 0;
      const visaSavingsAlt = location.visaSavingsAlt ?? null;
      // No visa path exists at all for anyone (undefined, not a $0 threshold) —
      // e.g. Vietnam, Sri Lanka, and India for non-OCI holders. Must not be
      // silently treated as "income >= $0 always qualifies" via the ?? 0 fallback above.
      const hasNoVisaPath = location.visaIncomeMinMonthly === undefined && location.visaSavingsAlt === undefined;
      let qualificationStatus: QualificationStatus;
      let savingsRouteRequired = false;
      let visaDeficit = false;

      if (hasAbode) {
        qualificationStatus = 'income'; // treated as fully qualified — no visa needed at all
        score += 20; // access bonus, larger than the standard +10 income-route bonus
      } else if (hasNoVisaPath) {
        qualificationStatus = 'deficit';
        visaDeficit = true;
        score -= 25;
      } else if (totalMonthlyIncome >= visaIncomeMin) {
        qualificationStatus = 'income';
        score += 10;
      } else if (visaSavingsAlt !== null && liquidAssets >= visaSavingsAlt) {
        qualificationStatus = 'savings';
        savingsRouteRequired = true;
        score += 5;
      } else {
        qualificationStatus = 'deficit';
        visaDeficit = true;
        score -= 25;
      }

      // 3. Climate preference modifier
      const climatePreference = priorities.climatePreference as string;
      if (climatePreference) {
        const matchingTypes = CLIMATE_MATCHES[climatePreference] ?? [];
        if (matchingTypes.includes(profile.climateType)) {
          score += 8;
        } else {
          score -= 5;
        }
      }

      // 4. Feature 6: small currency-stability modifier. Disclosure-only —
      // never forecasts exchange rates, just a tiny nudge for USD/pegged safety.
      if (location.usdRelationship === 'usd' || location.usdRelationship === 'pegged') {
        score += 3;
      }

      // 5. Clamp to 0–100
      score = Math.round(Math.max(0, Math.min(100, score)));

      const budgetLow = location.monthlyBudgetCoupleLow ?? Math.round(location.monthlyComfortableCost * 1.7);
      const budgetHigh = location.monthlyBudgetCoupleHigh ?? Math.round(location.monthlyComfortableCost * 2.3);
      const midBudget = (budgetLow + budgetHigh) / 2;

      // Hard-filter evaluation (after all scoring modifiers)
      const failedMustHaves = applyHardFilters(location, nonNegotiables, budgetLow);

      return {
        countryKey: profile.id,
        name: location.label,
        flag: profile.flag,
        score,
        qualificationStatus,
        savingsRouteRequired,
        visaDeficit,
        visaIncomeMin,
        visaSavingsAlt,
        budgetLow,
        budgetHigh,
        surplus: totalMonthlyIncome - midBudget,
        visaName: location.visaName ?? 'Residency Visa',
        visaRequirementsNote: buildVisaRequirementsNote(location),
        taxNote: location.taxNote,
        taxPosture: location.taxPosture,
        healthcareNote: location.healthcareNote,
        honestReality: profile.honestReality,
        topStrengths: profile.strengths,
        failedMustHaves,
        airQualityBand: `${pm25ToBand(location.airQualityPM25)} · ${location.airQualityPM25} µg/m³`,
        airQualityPM25: location.airQualityPM25,
        accessLevel: deriveAccessLevel(passportProfile, location, qualificationStatus),
        monthlyRatings: location.monthlyRatings,
        localCurrency: location.localCurrency,
        usdRelationship: location.usdRelationship,
        fxVolatilityBand: location.fxVolatilityBand,
      } satisfies CountryScore;
    })
    // Failures always sort after passes; within each group, sort by score desc.
    .sort((a, b) => {
      const aFails = a.failedMustHaves.length > 0;
      const bFails = b.failedMustHaves.length > 0;
      if (aFails !== bFails) return aFails ? 1 : -1;
      return b.score - a.score;
    });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
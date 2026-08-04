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
import type { Step3Data, CountryScore, QualificationStatus } from '@/types/assessment';

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

const PRIORITY_KEY_MAP: Record<Criterion, keyof Omit<Step3Data, 'climatePreference' | 'hasHealthConditions'>> = {
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

export function calculateScores(
  priorities: Step3Data,
  totalMonthlyIncome: number,
  liquidAssets: number,
): CountryScore[] {
  const MAX_POSSIBLE = CRITERIA.length * 10 * 5; // 500 (constant denominator for fairness)

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
      let score = (weightedSum / MAX_POSSIBLE) * 80;

      // 2. Hard visa-solvency modifier
      const visaIncomeMin = location.visaIncomeMinMonthly ?? 0;
      const visaSavingsAlt = location.visaSavingsAlt ?? null;
      let qualificationStatus: QualificationStatus;
      let savingsRouteRequired = false;
      let visaDeficit = false;

      if (totalMonthlyIncome >= visaIncomeMin) {
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

      // 4. Clamp to 0–100
      score = Math.round(Math.max(0, Math.min(100, score)));

      const budgetLow = location.monthlyBudgetCoupleLow ?? Math.round(location.monthlyComfortableCost * 1.7);
      const budgetHigh = location.monthlyBudgetCoupleHigh ?? Math.round(location.monthlyComfortableCost * 2.3);
      const midBudget = (budgetLow + budgetHigh) / 2;

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
      } satisfies CountryScore;
    })
    .sort((a, b) => b.score - a.score);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

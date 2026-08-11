export type { ClaimingAge } from '@/lib/ss-engine';
import type { MonthRating } from '@/lib/ss-engine';
export type { Sex, SmokingStatus, HealthStatus } from '@/lib/actuarial-engine';

export type ClimatePreference = 'mediterranean' | 'tropical' | 'four_seasons' | 'mild' | '';
export type ReportTier = 'standard' | 'premium';
export type QualificationStatus = 'income' | 'savings' | 'deficit' | 'right-of-abode';
export type AccessLevel = 'resident-by-passport' | 'retiree-visa-eligible' | 'tourist-only';

/** Passport & citizenship profile for the user. Stored top-level in the assessment store.
 *  descentEligible is informational ONLY — it never alters scoring or solvency calculations. */
export interface PassportProfile {
  /** Passport group IDs the user holds: 'us', 'eu-eea', 'uk', 'ca', 'au', 'nz'. */
  passports: string[];
  /** Overseas Citizen of India card holder. */
  hasOCI: boolean;
  /** Countries where the user may be eligible for citizenship by descent. Informational only. */
  descentEligible?: string[];
}

/** Hard-filter non-negotiables set by the user in Step 3.
 *  Each field is optional: undefined = filter not active. */
export interface NonNegotiables {
  /** Max acceptable monthly couple budget (USD/mo). Active when > 0. */
  costCeiling?: number;
  /** Require a Class-A private specialty hospital ≤ 30 min. */
  hospitalWithin30min?: boolean;
  /** Require annual mean PM2.5 ≤ 35 µg/m³ (WHO IT-1). Active filter currently excludes Thailand (38 µg/m³). */
  cleanAir?: boolean;
  /** Require reliable broadband ≥ 100 Mbps. */
  internet100?: boolean;
  /** Require an international airport ≤ 1 hour. */
  airportWithin1hr?: boolean;
  /** Require net-favorable tax treatment for US SS and pension income. */
  taxFriendly?: boolean;
}

export interface Step1Data {
  fraBenefit: number;
  selectedClaimingAge: 62 | 65 | 67 | 70;
  ssMonthlyBenefit: number;
  pension: number;
  dividendIncome: number;
  rentalIncome: number;
  otherIncome: number;
  liquidAssets: number;
  withdrawalRate: number;          // 0.03–0.05; default 0.04
  portfolioMonthlyIncome: number;  // computed: liquidAssets * withdrawalRate / 12
  totalMonthlyIncome: number;
}

export interface Step2Data {
  age: number;
  sex: 'male' | 'female';
  smoking: 'never' | 'former' | 'current';
  health: 'excellent' | 'good' | 'fair' | 'poor';
  motherAgeAtDeath: number | undefined;
  fatherAgeAtDeath: number | undefined;
  medianAge: number;
  p75Age: number;
  p25Age: number;
  adjustedRemainingYears: number;
}

export interface Step3Data {
  healthcare: number;
  climate: number;
  language: number;
  proximity: number;
  safety: number;
  cost: number;
  expatCommunity: number;
  infrastructure: number;
  culture: number;
  banking: number;
  airQuality: number;
  climatePreference: ClimatePreference;
  hasHealthConditions: boolean;
  nonNegotiables: NonNegotiables;
}

export interface CountryScore {
  countryKey: string;
  name: string;
  flag: string;
  score: number;
  qualificationStatus: QualificationStatus;
  savingsRouteRequired: boolean;
  visaDeficit: boolean;
  visaIncomeMin: number;
  visaSavingsAlt: number | null;
  budgetLow: number;
  budgetHigh: number;
  surplus: number;
  visaName: string;
  visaRequirementsNote: string;
  taxNote: string;
  taxPosture: string;
  healthcareNote: string;
  honestReality: string;
  topStrengths: string[];
  /** Labels for any active hard filter this country failed. Empty = passes all. */
  failedMustHaves: string[];
  /** Human-readable air quality band + raw PM2.5 value, e.g. 'Good · 8 µg/m³'. */
  airQualityBand: string;
  airQualityPM25: number;
  /** Right of movement / residency level based on passport, independent of visa-solvency. */
  accessLevel: AccessLevel;
  /** Feature 5: 12-month climate/hazard rating grid. Undefined if location has no data yet. */
  monthlyRatings?: MonthRating[];
}

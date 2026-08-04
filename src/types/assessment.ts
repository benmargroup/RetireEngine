export type { ClaimingAge } from '@/lib/ss-engine';
export type { Sex, SmokingStatus, HealthStatus } from '@/lib/actuarial-engine';

export type ClimatePreference = 'mediterranean' | 'tropical' | 'four_seasons' | 'mild' | '';
export type ReportTier = 'standard' | 'premium';
export type QualificationStatus = 'income' | 'savings' | 'deficit';

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
  climatePreference: ClimatePreference;
  hasHealthConditions: boolean;
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
}

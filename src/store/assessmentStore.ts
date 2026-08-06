import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  CountryScore,
  ReportTier,
  NonNegotiables,
  PassportProfile,
} from '@/types/assessment';

// re-export so components can import from one place
export type { NonNegotiables, PassportProfile };

const DEFAULT_STEP1: Step1Data = {
  fraBenefit: 0,
  selectedClaimingAge: 67,
  ssMonthlyBenefit: 0,
  pension: 0,
  dividendIncome: 0,
  rentalIncome: 0,
  otherIncome: 0,
  liquidAssets: 0,
  withdrawalRate: 0.04,
  portfolioMonthlyIncome: 0,
  totalMonthlyIncome: 0,
};

const DEFAULT_STEP2: Step2Data = {
  age: 65,
  sex: 'male',
  smoking: 'never',
  health: 'good',
  motherAgeAtDeath: undefined,
  fatherAgeAtDeath: undefined,
  medianAge: 0,
  p75Age: 0,
  p25Age: 0,
  adjustedRemainingYears: 0,
};

const DEFAULT_STEP3: Step3Data = {
  healthcare: 3,
  climate: 3,
  language: 3,
  proximity: 3,
  safety: 3,
  cost: 3,
  expatCommunity: 3,
  infrastructure: 3,
  culture: 3,
  banking: 3,
  airQuality: 3,
  climatePreference: '',
  hasHealthConditions: false,
  nonNegotiables: {},
};

interface AssessmentState {
  step: 1 | 2 | 3 | 4;
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  passportProfile: PassportProfile;
  results: CountryScore[];
  email: string;
  name: string;
  selectedTier: ReportTier | null;
  assessmentId: string | null;
  paymentConfirmed: boolean;
  // Consent flags — all default false; must be explicitly set by user action
  emailConsent: boolean;
  notAdviceAck: boolean;
  referralConsent: boolean;
}

interface AssessmentActions {
  setStep: (step: 1 | 2 | 3 | 4) => void;
  setStep1: (data: Step1Data) => void;
  setStep2: (data: Step2Data) => void;
  setStep3: (data: Step3Data) => void;
  setPassportProfile: (profile: PassportProfile) => void;
  setResults: (results: CountryScore[]) => void;
  setEmail: (email: string) => void;
  setName: (name: string) => void;
  setSelectedTier: (tier: ReportTier | null) => void;
  setAssessmentId: (id: string | null) => void;
  setPaymentConfirmed: (confirmed: boolean) => void;
  setEmailConsent: (v: boolean) => void;
  setNotAdviceAck: (v: boolean) => void;
  setReferralConsent: (v: boolean) => void;
  reset: () => void;
}

const DEFAULT_PASSPORT_PROFILE: PassportProfile = {
  passports: ['us'],
  hasOCI: false,
};

const INITIAL_STATE: AssessmentState = {
  step: 1,
  step1: DEFAULT_STEP1,
  step2: DEFAULT_STEP2,
  step3: DEFAULT_STEP3,
  passportProfile: DEFAULT_PASSPORT_PROFILE,
  results: [],
  email: '',
  name: '',
  selectedTier: null,
  assessmentId: null,
  paymentConfirmed: false,
  emailConsent: false,
  notAdviceAck: false,
  referralConsent: false,
};

export const useAssessmentStore = create<AssessmentState & AssessmentActions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setStep: (step) => set({ step }),
      setStep1: (step1) => set({ step1 }),
      setStep2: (step2) => set({ step2 }),
      setStep3: (step3) => set({ step3 }),
      setPassportProfile: (passportProfile) => set({ passportProfile }),
      setResults: (results) => set({ results }),
      setEmail: (email) => set({ email }),
      setName: (name) => set({ name }),
      setSelectedTier: (selectedTier) => set({ selectedTier }),
      setAssessmentId: (assessmentId) => set({ assessmentId }),
      setPaymentConfirmed: (paymentConfirmed) => set({ paymentConfirmed }),
      setEmailConsent: (emailConsent) => set({ emailConsent }),
      setNotAdviceAck: (notAdviceAck) => set({ notAdviceAck }),
      setReferralConsent: (referralConsent) => set({ referralConsent }),
      reset: () => set(INITIAL_STATE),
    }),
    {
      name: 'lss-assessment-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

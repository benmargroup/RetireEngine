import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';

// ----- Design tokens -----
const NAVY = '#0A1628';
const GOLD = '#C9A84C';
const CREAM = '#F8F4EE';
const SAGE = '#7A8C7E';
const WHITE = '#FFFFFF';
const SLATE = '#475569';
const LIGHT = '#F1F5F9';

const styles = StyleSheet.create({
  page: {
    backgroundColor: CREAM,
    fontFamily: 'Helvetica',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontSize: 10,
    color: NAVY,
  },
  cover: {
    backgroundColor: NAVY,
  },
  // Typography
  h1: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: WHITE, marginBottom: 8 },
  h2: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 6 },
  h3: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 4 },
  h4: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  body: { fontSize: 10, color: SLATE, lineHeight: 1.5, marginBottom: 6 },
  small: { fontSize: 8, color: SAGE },
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: SAGE, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  // Layout
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  spacer: { marginBottom: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: GOLD, marginVertical: 12 },
  // Cards
  card: { backgroundColor: WHITE, borderRadius: 6, padding: 12, marginBottom: 10 },
  cardNavy: { backgroundColor: NAVY, borderRadius: 6, padding: 12, marginBottom: 10 },
  highlight: { backgroundColor: CREAM, borderRadius: 6, padding: 10, marginBottom: 8 },
  // Badges
  badgeGreen: { backgroundColor: '#D1FAE5', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeBlue: { backgroundColor: '#DBEAFE', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeRed: { backgroundColor: '#FEE2E2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgePurple: { backgroundColor: '#EDE9FE', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  badgeAmber: { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  // Table
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 5 },
  tableHeader: { backgroundColor: NAVY, paddingVertical: 6, paddingHorizontal: 4 },
  tableCell: { flex: 1, fontSize: 9, color: SLATE, paddingHorizontal: 4 },
  tableCellBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, paddingHorizontal: 4 },
  tableCellHeader: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: WHITE, paddingHorizontal: 4 },
  // Footer
  footer: { position: 'absolute', bottom: 20, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between' },
});

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const COUNTRY_CODES: Record<string, string> = {
  portugal: 'PT', panama: 'PA', 'costa rica': 'CR', malaysia: 'MY',
  colombia: 'CO', france: 'FR', thailand: 'TH', spain: 'ES',
  mexico: 'MX', italy: 'IT',
};
function countryCode(name: string): string {
  const key = name.toLowerCase().split('(')[0].trim();
  return COUNTRY_CODES[key] ?? name.slice(0, 2).toUpperCase();
}

// ----- Helper components -----

function PageFooter({ page, total }: { page: number; total: number }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.small}>© 2026 RetireEngine · retireengine.com</Text>
      <Text style={styles.small}>Page {page} of {total}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.divider} />
    </View>
  );
}

// ----- Page components -----

function CoverPage({ email, tier }: { email: string; tier: string }) {
  return (
    <Page size="A4" style={[styles.page, styles.cover]}>
      {/* Gold accent bar */}
      <View style={{ height: 6, backgroundColor: GOLD, marginHorizontal: -44, marginTop: -40, marginBottom: 60 }} />

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {/* Brand */}
        <Text style={[styles.small, { color: GOLD, letterSpacing: 2, marginBottom: 24 }]}>
          RETIREENGINE · THE RETIREMENT DECISION ENGINE
        </Text>

        <Text style={[styles.h1, { fontSize: 32, marginBottom: 4 }]}>
          Your Retirement Abroad
        </Text>
        <Text style={[styles.h1, { fontSize: 32, color: GOLD }]}>
          Blueprint
        </Text>

        <View style={{ marginTop: 24, marginBottom: 40 }}>
          <Text style={[styles.body, { color: '#CBD5E1', fontSize: 11 }]}>
            {tier === 'premium' ? 'Premium Edition · 11 Pages' : 'Standard Edition · 8 Pages'}
          </Text>
          <Text style={[styles.body, { color: '#94A3B8' }]}>Prepared for: {email}</Text>
          <Text style={[styles.body, { color: '#94A3B8' }]}>
            Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: '#1E3A5F', paddingTop: 16 }}>
          <Text style={[styles.small, { color: '#64748B', lineHeight: 1.5 }]}>
            Educational planning tool only. Not financial, tax, immigration, or legal advice.
            Visa thresholds reflect 2026 published requirements. Consult qualified professionals
            before making relocation decisions.
          </Text>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={{ marginHorizontal: -44, marginBottom: -40, height: 4, backgroundColor: GOLD }} />
    </Page>
  );
}

function FinancialSummaryPage({
  totalMonthlyIncome,
  liquidAssets,
  fraBenefit,
  selectedClaimingAge,
  ssMonthlyBenefit,
  medianAge,
  vitalityYears,
  planningYears,
  pageNum,
  total,
}: {
  totalMonthlyIncome: number;
  liquidAssets: number;
  fraBenefit: number;
  selectedClaimingAge: number;
  ssMonthlyBenefit: number;
  medianAge: number;
  vitalityYears: number;
  planningYears: number;
  pageNum: number;
  total: number;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="Your Financial & Longevity Profile" />

      <View style={styles.row}>
        <View style={[styles.cardNavy, styles.col]}>
          <Text style={styles.label}>Monthly Income</Text>
          <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', color: GOLD }}>{fmt(totalMonthlyIncome)}</Text>
          <Text style={[styles.small, { color: '#94A3B8', marginTop: 2 }]}>Total across all streams</Text>
        </View>
        <View style={[styles.cardNavy, styles.col]}>
          <Text style={styles.label}>Liquid Assets</Text>
          <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', color: GOLD }}>{fmt(liquidAssets)}</Text>
          <Text style={[styles.small, { color: '#94A3B8', marginTop: 2 }]}>Available for savings-route visas</Text>
        </View>
      </View>

      <View style={[styles.card, { marginBottom: 12 }]}>
        <Text style={styles.h4}>Social Security Claiming Strategy</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>FRA Benefit (age 67)</Text>
            <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY }}>{fmt(fraBenefit)}/mo</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Your Selected Claiming Age</Text>
            <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: GOLD }}>Age {selectedClaimingAge}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Your Monthly SS Benefit</Text>
            <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY }}>{fmt(ssMonthlyBenefit)}/mo</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { marginBottom: 12 }]}>
        <Text style={styles.h4}>Your Vitality Window</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Median Life Expectancy</Text>
            <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: NAVY }}>Age {medianAge}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Peak Active Years</Text>
            <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#059669' }}>{vitalityYears} years</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Total Planning Horizon</Text>
            <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: SAGE }}>{planningYears} years</Text>
          </View>
        </View>
        <Text style={[styles.small, { marginTop: 8 }]}>
          Based on SSA 2023 period life tables with personalized health and family-history adjustments.
          Educational estimate only.
        </Text>
      </View>

      <PageFooter page={pageNum} total={total} />
    </Page>
  );
}

function TopCountryPage({
  country,
  rank,
  totalMonthlyIncome,
  liquidAssets,
  pageNum,
  total,
}: {
  country: {
    name: string; flag: string; score: number; visaName: string; visaRequirementsNote: string;
    visaIncomeMin: number; visaSavingsAlt: number | null; budgetLow: number; budgetHigh: number;
    surplus: number; qualificationStatus: string; honestReality: string; topStrengths: string[];
    accessLevel: string;
    localCurrency?: string;
    usdRelationship?: string;
  };
  rank: number;
  totalMonthlyIncome: number;
  liquidAssets: number;
  pageNum: number;
  total: number;
}) {
  const qualBadge =
    country.qualificationStatus === 'income' ? { style: styles.badgeGreen, text: 'Income Route Qualifies', color: '#065F46' } :
    country.qualificationStatus === 'savings' ? { style: styles.badgeBlue, text: 'Savings Route Available', color: '#1E40AF' } :
    { style: styles.badgeRed, text: 'Below Visa Threshold', color: '#991B1B' };

  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title={`Country Match #${rank}`} />

      {/* Header */}
      <View style={[styles.cardNavy, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Text style={{ fontSize: 36 }}>{country.flag}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.h2, { color: WHITE, marginBottom: 2 }]}>{country.name}</Text>
          <Text style={[styles.small, { color: '#94A3B8' }]}>{country.visaName}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', color: GOLD }}>{country.score}</Text>
          <Text style={[styles.small, { color: '#94A3B8' }]}>/100</Text>
        </View>
      </View>

      {/* Qualification + Budget */}
      <View style={styles.row}>
        <View style={[styles.card, styles.col]}>
          <Text style={styles.label}>Visa Qualification</Text>
          <View style={qualBadge.style}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: qualBadge.color }}>
              {qualBadge.text}
            </Text>
          </View>
          <Text style={[styles.small, { marginTop: 6 }]}>
            Income threshold: {fmt(country.visaIncomeMin)}/mo
          </Text>
          {country.accessLevel === 'resident-by-passport' && (
            <View style={styles.badgePurple}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#5B21B6' }}>
                Resident by Passport — No Visa Needed
              </Text>
            </View>
          )}
          {country.usdRelationship && (country.usdRelationship === 'usd' || country.usdRelationship === 'pegged') && (
            <View style={styles.badgeGreen}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#065F46' }}>
                Uses US Dollars — No Currency Risk
              </Text>
            </View>
          )}
          {country.usdRelationship === 'floating' && (
            <View style={styles.badgeAmber}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#92400E' }}>
                Spends in {country.localCurrency ?? 'local currency'} — Budget 10–15% FX Cushion
              </Text>
            </View>
          )}
          {country.visaSavingsAlt && (
            <Text style={styles.small}>Savings route: {fmt(country.visaSavingsAlt)}</Text>
          )}
        </View>
        <View style={[styles.card, styles.col]}>
          <Text style={styles.label}>Monthly Budget (Couple)</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY }}>
            {fmt(country.budgetLow)} – {fmt(country.budgetHigh)}
          </Text>
          <Text style={[styles.small, { marginTop: 4, color: country.surplus >= 0 ? '#059669' : '#DC2626' }]}>
            {country.surplus >= 0
              ? `+${fmt(country.surplus)}/mo surplus vs. mid-budget`
              : `${fmt(Math.abs(country.surplus))}/mo below comfortable mid-budget`}
          </Text>
        </View>
      </View>

      {/* Visa description */}
      <View style={styles.card}>
        <Text style={styles.h4}>Visa Requirements</Text>
        <Text style={styles.body}>{country.visaRequirementsNote}</Text>
      </View>

      {/* Strengths */}
      <View style={styles.card}>
        <Text style={styles.h4}>Top Strengths for Your Profile</Text>
        {country.topStrengths.map((s) => (
          <View key={s} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 }}>
            <Text style={{ color: GOLD, marginRight: 6 }}>✓</Text>
            <Text style={styles.body}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Honest reality */}
      <View style={[styles.highlight, { borderLeftWidth: 3, borderLeftColor: GOLD, paddingLeft: 10 }]}>
        <Text style={[styles.label, { marginBottom: 4 }]}>Honest Reality Check</Text>
        <Text style={styles.body}>{country.honestReality}</Text>
      </View>

      <PageFooter page={pageNum} total={total} />
    </Page>
  );
}

function ComparisonMatrixPage({
  results,
  totalMonthlyIncome,
  pageNum,
  total,
}: {
  results: Array<{
    name: string; flag: string; score: number; visaName: string;
    visaIncomeMin: number; budgetLow: number; budgetHigh: number;
    qualificationStatus: string; surplus: number;
  }>;
  totalMonthlyIncome: number;
  pageNum: number;
  total: number;
}) {
  const COLS = ['Country', 'Score', 'Budget Range', 'Visa Min', 'Qualification', 'Monthly Fit'];

  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="All 10 Countries — Comparison Matrix" />

      {/* Table header */}
      <View style={[styles.tableHeader, { flexDirection: 'row' }]}>
        {COLS.map((h) => (
          <Text key={h} style={[styles.tableCellHeader, h === 'Country' ? { flex: 2 } : {}]}>{h}</Text>
        ))}
      </View>

      {results.map((c, i) => {
        const qualText =
          c.qualificationStatus === 'income' ? '✓ Income' :
          c.qualificationStatus === 'savings' ? '~ Savings' : '✗ Gap';
        const qualColor =
          c.qualificationStatus === 'income' ? '#059669' :
          c.qualificationStatus === 'savings' ? '#2563EB' : '#DC2626';

        return (
          <View key={c.name} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? WHITE : '#F8FAFC' }]}>
            <Text style={[styles.tableCellBold, { flex: 2 }]}>{countryCode(c.name)} · {c.name}</Text>
            <Text style={styles.tableCellBold}>{c.score}</Text>
            <Text style={styles.tableCell}>{fmt(c.budgetLow)}–{fmt(c.budgetHigh)}</Text>
            <Text style={styles.tableCell}>{fmt(c.visaIncomeMin)}/mo</Text>
            <Text style={[styles.tableCell, { color: qualColor, fontFamily: 'Helvetica-Bold' }]}>{qualText}</Text>
            <Text style={[styles.tableCell, { color: c.surplus >= 0 ? '#059669' : '#DC2626' }]}>
              {c.surplus >= 0 ? `+${fmt(c.surplus)}` : fmt(c.surplus)}
            </Text>
          </View>
        );
      })}

      <Text style={[styles.small, { marginTop: 12 }]}>
        Budget Range = comfortable lifestyle for a couple/month. Monthly Fit = income vs. mid-budget.
        Visa qualification uses your income of {fmt(totalMonthlyIncome)}/month.
      </Text>

      <PageFooter page={pageNum} total={total} />
    </Page>
  );
}

function ActionChecklistPage({ tier, pageNum, total }: { tier: string; pageNum: number; total: number }) {
  const ACTIONS = [
    { day: 'Days 1–3', task: 'Download your My Social Security statement at ssa.gov/myaccount and verify FRA benefit figure' },
    { day: 'Days 4–7', task: 'Book a consultation with a tax attorney specializing in US expat taxation (FEIE, FTC analysis)' },
    { day: 'Days 8–10', task: 'Request visa requirements from consulates of your top 2 countries (processing times vary)' },
    { day: 'Days 11–14', task: 'Get international health insurance quotes (Cigna Global, Allianz Care, AXA)' },
    { day: 'Days 15–17', task: 'Join expat forums for your top country (Facebook groups, InterNations) — connect with 3 people already there' },
    { day: 'Days 18–21', task: 'Book a scouting trip (2–3 weeks, not a vacation) — find a short-term rental in target neighborhood' },
    { day: 'Days 22–25', task: 'Consult with a state domicile attorney to determine residency break strategy (affects state income tax)' },
    { day: 'Days 26–30', task: 'Begin organizing financial records: 3 months bank statements, tax returns (2 years), proof of income letters' },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="30-Day Action Checklist" />

      <Text style={styles.body}>
        The biggest risk in retirement abroad planning is not acting. Each of these steps
        takes 1–3 hours and builds momentum toward a decision.
      </Text>

      <View style={{ marginTop: 8 }}>
        {ACTIONS.map(({ day, task }) => (
          <View key={day} style={[styles.tableRow, { alignItems: 'flex-start', paddingVertical: 8 }]}>
            <View style={{ width: 72 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: GOLD }}>{day}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: SLATE, lineHeight: 1.5 }}>{task}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.highlight, { marginTop: 12 }]}>
        <Text style={styles.label}>Reminder</Text>
        <Text style={styles.body}>
          This checklist is educational. None of these steps constitutes legal, tax, or financial advice.
          Always verify current visa requirements directly with the relevant consulate or immigration attorney.
        </Text>
      </View>

      <PageFooter page={pageNum} total={total} />
    </Page>
  );
}
function StateDomicilePage({ pageNum, total }: { pageNum: number; total: number }) {
  const STICKY_STATES = ['California', 'New York', 'Virginia', 'New Jersey'];
  const ZERO_TAX_STATES = ['Texas', 'Florida', 'South Dakota'];

  const STEPS = [
    'Establish a physical address in a zero-tax state (TX, FL, or SD) BEFORE your departure date — a mail-forwarding service alone is usually not sufficient.',
    'Obtain a driver\'s license or state ID from your new domicile state, and surrender your old state\'s license.',
    'Register to vote in your new domicile state.',
    'Update your address with the IRS, Social Security Administration, and all financial institutions (banks, brokerages, insurers).',
    'File a "final" part-year or non-resident tax return in your old state if required, clearly documenting your departure date.',
    'Move and re-title vehicles, and update vehicle registration and insurance to the new state.',
    'If possible, spend more time physically present in the new domicile state than in the old one during the transition year.',
    'Keep dated records (utility bills, lease/purchase agreements, credit card statements) proving your new state is your genuine home base — "sticky" states aggressively contest domicile changes and the burden of proof falls on you.',
  ];

  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="State Domicile — Pre-Departure Checklist" />

      <Text style={[styles.body, { marginBottom: 12 }]}>
        Several states continue taxing former residents on worldwide income unless domicile is
        formally and provably broken. Handling this correctly, before you leave, is one of the
        most commonly overlooked steps in expat planning.
      </Text>

      <View style={styles.row}>
        <View style={[styles.card, styles.col, { borderLeftWidth: 3, borderLeftColor: '#DC2626', paddingLeft: 10 }]}>
          <Text style={[styles.label, { color: '#991B1B' }]}>&quot;Sticky&quot; States (Aggressive)</Text>
          {STICKY_STATES.map((s) => (
            <Text key={s} style={styles.body}>• {s}</Text>
          ))}
        </View>
        <View style={[styles.card, styles.col, { borderLeftWidth: 3, borderLeftColor: '#059669', paddingLeft: 10 }]}>
          <Text style={[styles.label, { color: '#065F46' }]}>Zero-Tax Domicile Options</Text>
          {ZERO_TAX_STATES.map((s) => (
            <Text key={s} style={styles.body}>• {s}</Text>
          ))}
        </View>
      </View>

      <View style={[styles.card, { marginTop: 4 }]}>
        <Text style={styles.h4}>Pre-Departure Steps</Text>
        {STEPS.map((step) => (
          <View key={step.slice(0, 20)} style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={{ color: GOLD, marginRight: 6, fontSize: 9 }}>□</Text>
            <Text style={[styles.body, { flex: 1, fontSize: 9 }]}>{step}</Text>
          </View>
        ))}
      </View>

      <PageFooter page={pageNum} total={total} />
    </Page>
  );
}
function TaxFrameworkPage({ pageNum, total }: { pageNum: number; total: number }) {
  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="US Expat Tax Framework" />

      <Text style={[styles.body, { marginBottom: 12 }]}>
        US citizens remain taxable on worldwide income regardless of where they live.
        Two primary tools offset this — understand both before choosing a destination.
      </Text>

      <View style={styles.card}>
        <Text style={styles.h4}>Foreign Earned Income Exclusion (FEIE — Form 2555)</Text>
        <Text style={styles.body}>
          Excludes up to $126,500 (2024, indexed annually) of earned income. Requires either
          the bona fide residence test (≥1 full tax year abroad) or the physical presence test
          (330 days in 12 consecutive months abroad). Note: passive income (SS, dividends,
          pension) is NOT excluded — FEIE applies to earned income only.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h4}>Foreign Tax Credit (FTC — Form 1116)</Text>
        <Text style={styles.body}>
          Credits dollar-for-dollar for foreign taxes paid on income also taxed by the US.
          Most effective in high-tax countries (France, Spain, Italy) where foreign tax exceeds
          US liability. Ineffective in territorial-tax countries (Panama, Costa Rica) because
          foreign tax on US income = $0.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h4}>State Domicile — Critical and Overlooked</Text>
        <Text style={styles.body}>
          Nine states continue taxing former residents unless domicile is formally broken.
          California, Virginia, and South Carolina are the most aggressive. Steps required:
          (1) establish new domicile in a no-income-tax state before departure, (2) obtain
          driver&apos;s license and register to vote in new state, (3) move financial accounts.
          Failure to break domicile is the most common and expensive expat tax mistake.
        </Text>
      </View>

      <View style={[styles.highlight, { borderLeftWidth: 3, borderLeftColor: '#DC2626', paddingLeft: 10 }]}>
        <Text style={[styles.label, { color: '#991B1B' }]}>Warning</Text>
        <Text style={[styles.body, { color: '#7F1D1D' }]}>
          Social Security benefits may be partially taxable federally (up to 85%) regardless of
          where you live. Tax treaties affect how foreign countries tax your SS — but do not eliminate
          US federal taxation. Work with a US expat CPA (not a general tax preparer).
        </Text>
      </View>

      <PageFooter page={pageNum} total={total} />
    </Page>
  );
}

function MedicareRoadmapPage({ pageNum, total }: { pageNum: number; total: number }) {
  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="Medicare & International Health Coverage" />

      <View style={styles.card}>
        <Text style={styles.h4}>Medicare Abroad — What You Need to Know</Text>
        <Text style={styles.body}>
          Medicare Parts A and B do not cover healthcare received outside the United States
          (with extremely limited exceptions for emergencies near the Canadian/Mexican border).
          If you retire abroad, you will need alternative coverage.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h4}>Key Medicare Decisions Before Departure</Text>
        {[
          'Part B: You may suspend Part B while abroad but face a 10% penalty for each 12-month period you were eligible but not enrolled when you return. Evaluate the math carefully.',
          'Part D: Prescription drug coverage is US-only. Consider dropping it abroad, but re-enrollment penalties apply on return.',
          'Medigap: Suspend or drop it — it has no value outside the US.',
          'Medicare Advantage: Plans require you to live in the plan\'s service area. You will likely need to disenroll.',
        ].map((item) => (
          <View key={item.slice(0, 10)} style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={{ color: GOLD, marginRight: 6, marginTop: 1 }}>•</Text>
            <Text style={[styles.body, { flex: 1 }]}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.h4}>International Health Insurance Options</Text>
        {[
          { name: 'Cigna Global', note: 'Best-in-class network; direct billing at major hospitals worldwide; $150–400/mo depending on age and deductible' },
          { name: 'Allianz Care', note: 'Strong in Europe; good claims processing; mid-range pricing' },
          { name: 'AXA International', note: 'Global network; multiple tier options; strong dental add-on' },
          { name: 'Local Public Systems', note: 'Costa Rica (CAJA), Portugal (SNS), Spain (SNS) — mandatory enrollment for residents; quality varies by region' },
        ].map(({ name, note }) => (
          <View key={name} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY }}>{name}</Text>
            <Text style={styles.body}>{note}</Text>
          </View>
        ))}
      </View>

      <PageFooter page={pageNum} total={total} />
    </Page>
  );
}

function ActionPlanPage({ pageNum, total }: { pageNum: number; total: number }) {
  const PHASES = [
    {
      phase: 'Phase 1 (Month 1): Research & Validation',
      actions: [
        'Complete 30-day checklist from Standard report',
        'Conduct in-depth research on top 2 countries: cost data, healthcare specifics, neighborhood analysis',
        'Interview 3+ Americans currently living in each target location (expat Facebook groups)',
        'Get quotes from 2 international health insurers (Cigna, Allianz)',
        'Schedule consultation with US expat tax attorney',
      ],
    },
    {
      phase: 'Phase 2 (Month 2): On-the-Ground Scouting',
      actions: [
        'Take a 3–4 week scouting trip to top choice (not a vacation — test daily life)',
        'Stay in target neighborhood via Airbnb or short-term rental',
        'Visit 2–3 private hospitals or clinics; ask about US expat patient experience',
        'Meet with a local expat-friendly attorney on visa process specifics',
        'Open a local bank account if rules permit (some countries allow non-residents)',
        'Document real costs: groceries, utilities, transport, dining — compare to estimates',
      ],
    },
    {
      phase: 'Phase 3 (Month 3): Decision & Transition Planning',
      actions: [
        'Make go / no-go decision based on scouting trip findings',
        'If going: establish state domicile change before departure',
        'File FEIE/FTC analysis with expat CPA; determine optimal tax structure',
        'Begin visa application process (allow 3–6 months for most countries)',
        'Arrange healthcare coverage — coordinate with Medicare decision',
        'Set target move date and work backwards from it with an action list',
      ],
    },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <SectionHeader title="90-Day Action Plan" />

      {PHASES.map(({ phase, actions }) => (
        <View key={phase} style={{ marginBottom: 14 }}>
          <View style={{ backgroundColor: NAVY, borderRadius: 4, padding: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: GOLD }}>{phase}</Text>
          </View>
          {actions.map((action) => (
            <View key={action.slice(0, 20)} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 8 }}>
              <Text style={{ color: GOLD, marginRight: 6, fontSize: 9 }}>□</Text>
              <Text style={[styles.body, { flex: 1, fontSize: 9 }]}>{action}</Text>
            </View>
          ))}
        </View>
      ))}

      <PageFooter page={pageNum} total={total} />
    </Page>
  );
}

// ----- Main export -----

export interface ReportInput {
  tier: 'standard' | 'premium';
  email: string;
  assessmentData: {
    total_monthly_income?: number;
    liquid_assets?: number;
    fra_benefit?: number;
    selected_claiming_age?: number;
    ss_monthly_benefit?: number;
    longevity_median_age?: number;
    longevity_planning_years?: number;
    scores?: Array<{
      name: string; flag: string; score: number; visaName: string; visaRequirementsNote: string;
      visaIncomeMin: number; visaSavingsAlt: number | null; budgetLow: number; budgetHigh: number;
      surplus: number; qualificationStatus: string; honestReality: string; topStrengths: string[];
      accessLevel: string;
    }>;
  } | null;
}

export async function generateReportBuffer({ tier, email, assessmentData }: ReportInput): Promise<Buffer> {
  const d = assessmentData;
  const income = d?.total_monthly_income ?? 3500;
  const assets = d?.liquid_assets ?? 150000;
  const fra = d?.fra_benefit ?? 2400;
  const claimAge = d?.selected_claiming_age ?? 67;
  const ssBenefit = d?.ss_monthly_benefit ?? Math.floor(fra * 1.0);
  const medianAge = d?.longevity_median_age ?? 83;
  const planYears = d?.longevity_planning_years ?? 18;
  const currentAge = medianAge - Math.round(planYears);
  const vitalityYears = Math.max(0, (medianAge - 5) - currentAge);

  const results = d?.scores ?? [
    {
      name: 'Portugal', flag: '🇵🇹', score: 82, visaName: 'D7 Passive Income Visa',
      visaRequirementsNote: 'D7 Passive Income Visa. Requires $1,000/month income.', visaIncomeMin: 1000, visaSavingsAlt: 12000,
      budgetLow: 3000, budgetHigh: 4200, surplus: income - 3600, qualificationStatus: 'income', accessLevel: 'retiree-visa-eligible',
      honestReality: 'NHR ended March 2025 but Portugal remains one of the safest, most livable countries in Europe.',
      topStrengths: ['Safety', 'Healthcare', 'Expat Community'],
    },
  ];

  const totalPages = tier === 'premium' ? 11 : 8;

  const doc = (
    <Document title={`RetireEngine Blueprint — ${tier}`} author="RetireEngine">
      {/* Page 1: Cover */}
      <CoverPage email={email} tier={tier} />

      {/* Page 2: Financial & Longevity Summary */}
      <FinancialSummaryPage
        totalMonthlyIncome={income}
        liquidAssets={assets}
        fraBenefit={fra}
        selectedClaimingAge={claimAge}
        ssMonthlyBenefit={ssBenefit}
        medianAge={medianAge}
        vitalityYears={vitalityYears}
        planningYears={Math.round(planYears)}
        pageNum={2}
        total={totalPages}
      />

      {/* Pages 3–5: Top 3 country deep dives */}
      {results.slice(0, 3).map((c, i) => (
        <TopCountryPage
          key={c.name}
          country={c}
          rank={i + 1}
          totalMonthlyIncome={income}
          liquidAssets={assets}
          pageNum={3 + i}
          total={totalPages}
        />
      ))}

      {/* Page 6: All 10 countries matrix */}
      <ComparisonMatrixPage
        results={results}
        totalMonthlyIncome={income}
        pageNum={6}
        total={totalPages}
      />

      {/* Page 7 (Standard) / 7 (Premium): 30-Day checklist */}
      <ActionChecklistPage tier={tier} pageNum={7} total={totalPages} />

      {/* Pages 8–11: Premium only */}
      {tier === 'premium' && (
        <>
          <StateDomicilePage pageNum={8} total={totalPages} />
          <TaxFrameworkPage pageNum={9} total={totalPages} />
          <MedicareRoadmapPage pageNum={10} total={totalPages} />
          <ActionPlanPage pageNum={11} total={totalPages} />
        </>
      )}
    </Document>
  );

  const buffer = await renderToBuffer(doc as any);
  return Buffer.from(buffer);
}

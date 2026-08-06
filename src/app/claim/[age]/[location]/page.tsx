/**
 * /claim-social-security-at-[age]-in-[location]
 * -------------------------------------------------------------------------
 * Cluster 3 — fuses a Social Security claiming age (62/65/67/70) with a
 * domestic or expat destination from ss-engine.ts's LOCATIONS dataset.
 *
 * Fully statically generated: every {age}-in-{location} combination in
 * generateStaticParams has matching narrative copy in claiming-scenarios.json.
 * dynamicParams is disabled so any other combination 404s instead of
 * silently rendering with placeholder copy.
 * -------------------------------------------------------------------------
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LOCATIONS, CLAIMING_AGES, getLocation, type ClaimingAge } from '@/lib/ss-engine';
import ClaimingCalculator from '@/components/calculator/ClaimingCalculator';
import TrustBox, { type TrustSource } from '@/components/ui/TrustBox';
import scenarios from '@/data/claiming-scenarios.json';

interface ClaimingScenario {
  slug: string;
  title: string;
  metaDescription: string;
  narrative: string;
  tradeoffs: string[];
  taxNote: string;
  medicareNote: string;
}

const SCENARIOS = scenarios as ClaimingScenario[];

const SITE_URL = 'https://lifetimess.com';
const RULES_YEAR = 2026;

const TRUST_SOURCES: TrustSource[] = [
  {
    title: '2026 OASDI Trustees Report — Social Security Administration',
    url: 'https://www.ssa.gov/OACT/TR/2026/',
    dateVerified: '2026-01-15',
  },
  {
    title: 'IRS Publication 915 — Social Security and Equivalent Railroad Retirement Benefits',
    url: 'https://www.irs.gov/publications/p915',
    dateVerified: '2026-01-15',
  },
  {
    title: 'World Bank International Comparison Program (ICP) — Purchasing Power Parity Data',
    url: 'https://www.worldbank.org/en/programs/icp',
    dateVerified: '2026-01-15',
  },
  {
    title: 'U.S. Department of State — Country-Specific Immigration & Residency Statutes',
    url: 'https://travel.state.gov/',
    dateVerified: '2026-01-15',
  },
];

interface RouteParams {
  age: string;
  location: string;
}

/** Pre-render every {age}-in-{location} pair: 4 key ages × every LOCATIONS entry. */
export function generateStaticParams(): RouteParams[] {
  return CLAIMING_AGES.flatMap((age) =>
    LOCATIONS.map((loc) => ({ age: String(age), location: loc.id })),
  );
}

/** Only the pre-rendered combinations above are servable; everything else 404s. */
export const dynamicParams = false;

function isClaimingAge(value: string): value is `${ClaimingAge}` {
  return (CLAIMING_AGES as readonly number[]).some((a) => String(a) === value);
}

function resolveRoute(params: RouteParams) {
  if (!isClaimingAge(params.age)) return null;
  const location = getLocation(params.location);
  if (!location) return null;
  const scenario = SCENARIOS.find((s) => s.slug === `${params.age}-in-${params.location}`);
  if (!scenario) return null;
  return { age: Number(params.age) as ClaimingAge, location, scenario };
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const resolved = resolveRoute(params);
  if (!resolved) return {};
  const { scenario } = resolved;
  const canonicalPath = `/claim-social-security-at-${params.age}-in-${params.location}`;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  return {
    title: scenario.title,
    description: scenario.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: scenario.title,
      description: scenario.metaDescription,
      url: canonicalUrl,
      siteName: 'Lifetime SS',
      type: 'article',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: scenario.title,
      description: scenario.metaDescription,
    },
  };
}

function buildFaqJsonLd(age: ClaimingAge, locationLabel: string, scenario: ClaimingScenario) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What Social Security benefit will I get if I claim at ${age}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: scenario.tradeoffs[0] ?? scenario.narrative,
        },
      },
      {
        '@type': 'Question',
        name: `How is Social Security taxed if I live in ${locationLabel}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: scenario.taxNote,
        },
      },
      {
        '@type': 'Question',
        name: `What happens to my Medicare coverage in ${locationLabel}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: scenario.medicareNote,
        },
      },
      {
        '@type': 'Question',
        name: 'What is the break-even age between claiming at 62 and waiting until 70?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            scenario.tradeoffs.find((t) => t.toLowerCase().includes('break-even')) ??
            'The 62-vs-70 break-even age is typically the late 70s to early 80s in nominal dollars, depending on your exact benefit amount.',
        },
      },
    ],
  };
}

function buildArticleJsonLd(canonicalUrl: string, scenario: ClaimingScenario) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: scenario.title,
    description: scenario.metaDescription,
    url: canonicalUrl,
    datePublished: `${RULES_YEAR}-01-15`,
    dateModified: `${RULES_YEAR}-01-15`,
    author: {
      '@type': 'Organization',
      name: 'Lifetime SS',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Lifetime SS',
    },
  };
}

export default function ClaimAtAgeInLocationPage({ params }: { params: RouteParams }) {
  const resolved = resolveRoute(params);
  if (!resolved) notFound();
  const { age, location, scenario } = resolved;

  const canonicalUrl = `${SITE_URL}/claim-social-security-at-${params.age}-in-${params.location}`;
  const isExpat = location.kind === 'expat';

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(age, location.label, scenario)) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd(canonicalUrl, scenario)) }}
      />

      {/* Hero */}
      <header className="mb-10 max-w-3xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-teal-700">
          {location.kind === 'us-state' ? 'Domestic relocation' : 'Retiring abroad'} · {RULES_YEAR} rules
        </p>
        <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          Claim Social Security at {age} in {location.label}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          {scenario.narrative.split('. ').slice(0, 2).join('. ')}.
        </p>
      </header>

      {/* Interactive calculator, pre-filled to this location */}
      <section className="mb-12 rounded-3xl border border-slate-200 bg-white shadow-sm">
        <ClaimingCalculator defaultLocationId={location.id} />
      </section>

      {/* Narrative breakdown */}
      <section className="mb-12 space-y-8">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          The full picture: claiming at {age} and living in {location.label}
        </h2>

        <article>
          <h3 className="mb-2 text-base font-semibold text-slate-800">
            Break-even &amp; portfolio preservation
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">{scenario.narrative}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {scenario.tradeoffs.slice(0, 2).map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-0.5 text-teal-600">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </article>

        <article>
          <h3 className="mb-2 text-base font-semibold text-slate-800">
            {isExpat ? `Local visa & tax realities in ${location.label}` : `Tax realities in ${location.label}`}
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">{scenario.taxNote}</p>
          {isExpat ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {scenario.tradeoffs
                .filter((t) => t.toLowerCase().includes('visa'))
                .map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-0.5 text-teal-600">•</span>
                    <span>{t}</span>
                  </li>
                ))}
            </ul>
          ) : null}
        </article>

        <article>
          <h3 className="mb-2 text-base font-semibold text-slate-800">Healthcare &amp; Medicare strategy</h3>
          <p className="text-sm leading-relaxed text-slate-700">{scenario.medicareNote}</p>
        </article>
      </section>

      {/* Trust & citation block */}
      <TrustBox sources={TRUST_SOURCES} citationTitle={scenario.title} citationUrl={canonicalUrl} rulesYear={RULES_YEAR} />
    </main>
  );
}

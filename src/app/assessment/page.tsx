export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import AssessmentPageClient from './AssessmentPageClient';

export const metadata: Metadata = {
  title: 'Free Retirement Assessment & Global Matcher',
  description:
    'Run your personalized 4-minute assessment. Compare Social Security claiming ages, visa income rules, air quality, and currency risk across 10 destination hubs.',
};

export default function AssessmentPage({
  searchParams,
}: {
  searchParams: { intent?: string; session?: string };
}) {
  return <AssessmentPageClient intent={searchParams.intent} session={searchParams.session} />;
}
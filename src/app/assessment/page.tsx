export const dynamic = 'force-dynamic';

import AssessmentPageClient from './AssessmentPageClient';

export default function AssessmentPage({
  searchParams,
}: {
  searchParams: { intent?: string };
}) {
  return <AssessmentPageClient intent={searchParams.intent} />;
}
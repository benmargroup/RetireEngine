export const dynamic = 'force-dynamic';

import AssessmentPageClient from './AssessmentPageClient';

export default function AssessmentPage({
  searchParams,
}: {
  searchParams: { intent?: string; session?: string };
}) {
  return <AssessmentPageClient intent={searchParams.intent} session={searchParams.session} />;
}
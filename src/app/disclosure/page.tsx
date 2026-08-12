import Link from 'next/link';

export const metadata = { title: 'Affiliate & Not-Advice Disclosure — RetireEngine' };

export default function DisclosurePage() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Link href="/" className="mb-8 inline-block font-serif text-xl font-bold text-navy">
          RetireEngine
        </Link>

        <h1 className="mb-2 font-serif text-3xl font-bold text-navy">Disclosure</h1>
        <p className="mb-8 text-base text-slate-500">Effective: January 2026</p>

        <div className="space-y-8 text-base leading-relaxed text-slate-700">
          <section>
            <h2 className="mb-3 text-base font-bold text-navy">Not financial, legal, or immigration advice</h2>
            <p>
              RetireEngine provides educational planning estimates. Nothing on this site — including the
              RetireEngine Assessment, country rankings, visa qualification analysis, tax summaries,
              or PDF reports — constitutes financial advice, tax advice, legal advice, or immigration advice.
            </p>
            <p className="mt-2">
              All figures are based on publicly available 2026 rules and simplified assumptions. Rules change.
              Your personal situation is unique. Before acting on anything in our materials, verify all
              figures and consult a licensed financial planner, tax professional, attorney, or immigration
              specialist who is qualified in the relevant jurisdictions.
            </p>
            <p className="mt-2">
              We are not a registered investment advisor, law firm, accounting firm, or immigration consultancy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-navy">Affiliate and referral relationships</h2>
            <p>
              Some professional referrals and product links on RetireEngine are affiliate or referral
              partnerships. We may earn a referral fee if you engage a professional or purchase a product
              through our links. <strong>This fee is at no extra cost to you.</strong>
            </p>
            <p className="mt-2">
              Affiliate relationships <strong>never</strong> influence country rankings, visa qualification
              scores, or any analytical output. Rankings are computed purely from the scoring algorithm
              applied to your inputs; affiliate status of any country or service is not a factor.
            </p>
            <p className="mt-2">
              Professional referrals are only shared with partners when you explicitly check the
              &ldquo;Match me with a vetted independent professional&rdquo; consent box. You are under
              no obligation to engage any referred professional.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-navy">Accuracy and data currency</h2>
            <p>
              Visa income thresholds, cost of living figures, and tax treatment summaries are verified
              against official government and consular sources as of January 2026. These rules change
              without notice. Last-verified dates appear in the source citations on the results page.
              We cannot guarantee that figures remain current at the time you read them.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-navy">FTC compliance</h2>
            <p>
              In accordance with the FTC&apos;s Endorsement Guides (16 CFR Part 255), we disclose
              material connections between RetireEngine and any third party whose products or services
              are mentioned or linked. Paid placements, affiliate links, and referral partnerships
              are disclosed at the point of recommendation.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6 text-base text-slate-400">
          <Link href="/" className="hover:text-navy">← Back to RetireEngine</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-navy">Privacy Policy</Link>
        </div>
      </div>
    </main>
  );
}

import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — RetireEngine' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Link href="/" className="mb-8 inline-block font-serif text-xl font-bold text-navy">
          RetireEngine
        </Link>

        <h1 className="mb-2 font-serif text-3xl font-bold text-navy">Privacy Policy</h1>
        <p className="mb-8 text-base text-slate-500">Effective: January 2026</p>

        <div className="space-y-8 text-base leading-relaxed text-slate-700">
          <section>
            <h2 className="mb-3 text-base font-bold text-navy">What we collect</h2>
            <p>
              When you use the RetireEngine Assessment, we temporarily store your inputs (income, assets,
              age, priorities) in your browser&apos;s local storage to enable the multi-step wizard. This data
              never leaves your device unless you explicitly submit a form.
            </p>
            <p className="mt-2">
              If you enter your email in the free summary form or at checkout, we store your email address and
              your assessment results in our database. We store the date and whether you provided email consent
              (<code>emailConsent</code>).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-navy">Professional referrals</h2>
            <p>
              We only share your assessment data with vetted professionals if you explicitly check the
              &ldquo;Match me with a vetted independent professional&rdquo; box (<code>referralConsent</code>)
              at checkout. If you do not check that box, your data is never shared with third parties for
              marketing or referral purposes.
            </p>
            <p className="mt-2">
              These professional partners may be affiliate or referral relationships. See our{' '}
              <Link href="/disclosure" className="underline hover:text-navy">Affiliate Disclosure</Link> for details.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-navy">Payment data</h2>
            <p>
              All payment processing is handled by Stripe. We never store or see your card number, CVV,
              or other payment credentials. Stripe&apos;s privacy policy applies to payment data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-navy">Cookies and analytics</h2>
            <p>
              We use minimal analytics to understand which pages are visited. We do not use behavioral
              tracking, retargeting pixels, or third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-navy">Your rights</h2>
            <p>
              You may request deletion of your stored email and assessment data at any time by emailing{' '}
              <a href="mailto:privacy@retireengine.com" className="underline hover:text-navy">
                privacy@retireengine.com
              </a>
              . Unsubscribe links are included in every email we send.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6 text-base text-slate-400">
          <Link href="/" className="hover:text-navy">← Back to RetireEngine</Link>
          {' · '}
          <Link href="/disclosure" className="hover:text-navy">Affiliate Disclosure</Link>
        </div>
      </div>
    </main>
  );
}

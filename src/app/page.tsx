import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream">
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        {/* Eyebrow */}
        <p className="mb-4 text-base font-semibold uppercase tracking-[0.15em] text-charcoal">
          Retirement Decision Engine
        </p>

        {/* Brand headline */}
        <h1 className="font-serif text-4xl font-bold text-navy sm:text-5xl">
          RetireEngine
        </h1>

        {/* Subhead */}
        <p className="mx-auto mt-5 max-w-lg text-lg leading-[1.7] text-charcoal">
          Personalized Social Security claiming calculators, by age and by location.
        </p>

        {/* Vitality Window callout — signature moment */}
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-sage-light/40 bg-white px-8 py-7 shadow-sm">
          <p className="font-serif text-xl italic leading-[1.6] text-navy">
            &ldquo;Right-sizing your cost of living today buys back 5–10 years of active
            travel before physical limitations set in.&rdquo;
          </p>
        </div>

        {/* Primary CTA */}
        <div className="mt-10">
          <Link
            href="/assessment"
            className="inline-flex w-full items-center justify-center rounded-xl bg-forest px-8 py-4 text-base font-bold text-white transition-colors hover:bg-forest-dark sm:w-auto sm:px-10"
            style={{ minHeight: '56px' }}
          >
            Start Your Free Assessment →
          </Link>
          <p className="mt-3 text-base text-charcoal">
            Free Assessment · Takes ~4 minutes
          </p>
        </div>

        {/* Trust signals */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-sage-light/30 pt-8 text-base font-medium text-navy">
          <span>10 Countries Compared</span>
          <span className="text-sage">•</span>
          <span>2026 SSA Rules</span>
          <span className="text-sage">•</span>
          <span>Educational Tool — Not Financial Advice</span>
        </div>
      </div>
    </main>
  );
}
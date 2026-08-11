import Link from 'next/link';

const GATES = [
  {
    number: 1,
    href: '/assessment?intent=ss_timing',
    title: 'When should I take Social Security?',
    description: 'Calculate your break-even age (62 vs. 67 vs. 70) adjusted for your personal longevity.',
    cta: 'Start Claiming Model',
    featured: false,
  },
  {
    number: 2,
    href: '/assessment?intent=nest_egg',
    title: 'How much do I need to retire?',
    description: 'Model your portfolio withdrawal rate, passive income, and safe monthly budget.',
    cta: 'Run Retirement Solvency',
    featured: false,
  },
  {
    number: 3,
    href: '/assessment?intent=location_fit',
    title: 'Where can I get the best life?',
    description: 'Match your income to 10 global destinations with visa income rules and air quality data.',
    cta: 'Match Global Destinations',
    featured: true,
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream">
      <div className="mx-auto max-w-6xl px-6 py-10 text-center sm:py-16">
        {/* Brand name first, tagline underneath */}
        <h1 className="font-serif text-4xl font-bold text-navy sm:text-5xl">
          RetireEngine
        </h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-charcoal">
          Retirement Decision Engine
        </p>

        {/* Subhead */}
        <p className="mx-auto mt-5 max-w-lg text-lg leading-[1.7] text-charcoal">
          Make smarter claiming and lifestyle decisions. Select your primary question to start your personalized engine calculation.
        </p>

        {/* Vitality Window callout — signature moment */}
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-sage-light/40 bg-white px-6 py-5 shadow-sm sm:mt-8 sm:px-8 sm:py-7">
          <p className="font-serif text-xl italic leading-[1.6] text-navy">
            &ldquo;Right-sizing your cost of living today buys back 5–10 years of active
            travel before physical limitations set in.&rdquo;
          </p>
        </div>

        {/* The 3 Gates */}
        <div className="mt-8 grid gap-5 text-left sm:mt-10 md:grid-cols-3">
          {GATES.map((gate) => (
            <Link
              key={gate.number}
              href={gate.href}
              className={`group flex h-full flex-col rounded-xl border-2 p-6 transition hover:shadow-lg ${
                gate.featured
                  ? 'border-forest bg-forest/5'
                  : 'border-sage-light/50 bg-white hover:border-forest'
              }`}
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold transition ${
                  gate.featured
                    ? 'bg-forest text-white'
                    : 'bg-forest/10 text-forest group-hover:bg-forest group-hover:text-white'
                }`}
              >
                {gate.number}
              </div>
              <h3 className="mb-2 font-serif text-xl text-navy">{gate.title}</h3>
              <p className="mb-4 flex-1 text-base leading-[1.6] text-charcoal">{gate.description}</p>
              <span className="flex items-center gap-1 text-base font-semibold text-forest">
                {gate.cta} →
              </span>
            </Link>
          ))}
        </div>

        {/* Trust signals */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-sage-light/30 pt-6 text-base font-medium text-navy sm:mt-12 sm:pt-8">
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
import { NextResponse } from 'next/server';
import { stripe, PRICES } from '@/lib/stripe';
import type { ReportTier } from '@/types/assessment';

const IS_PLACEHOLDER = (key: string | undefined) =>
  !key || key.startsWith('your_') || key.startsWith('sk_test_placeholder');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tier, email, name, step1, step2, step3, results, notAdviceAck, referralConsent } = body as {
      tier: ReportTier;
      email: string;
      name: string;
      step1: Record<string, unknown>;
      step2: Record<string, unknown>;
      step3: Record<string, unknown>;
      results: Array<{ countryKey: string; score: number }>;
      notAdviceAck: boolean;
      referralConsent: boolean;
    };

    if (!tier || !email) {
      return NextResponse.json({ error: 'Missing tier or email' }, { status: 400 });
    }

    // Graceful dev fallback when Stripe is not configured
    if (IS_PLACEHOLDER(process.env.STRIPE_SECRET_KEY)) {
      console.info('[create-checkout] Stripe key is placeholder — returning dev mode redirect');
      return NextResponse.json({ devMode: true });
    }

    // Optionally persist to Supabase
    let assessmentId: string | null = null;
    if (!IS_PLACEHOLDER(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      try {
        const { createServiceClient } = await import('@/lib/supabase');
        const supabase = createServiceClient();
        const { data } = await supabase
          .from('assessments')
          .insert({
            email,
            name,
            fra_benefit: step1.fraBenefit,
            selected_claiming_age: step1.selectedClaimingAge,
            total_monthly_income: step1.totalMonthlyIncome,
            liquid_assets: step1.liquidAssets,
            longevity_median_age: step2.medianAge,
            longevity_planning_years: step2.adjustedRemainingYears,
            top_country_1: results[0]?.countryKey ?? null,
            top_country_2: results[1]?.countryKey ?? null,
            top_country_3: results[2]?.countryKey ?? null,
            scores: results,
            report_tier: tier,
            not_advice_ack: notAdviceAck ?? false,
            referral_consent: referralConsent ?? false,
          })
          .select('id')
          .single();
        assessmentId = data?.id ?? null;
        console.log('[create-checkout] Insert result - assessmentId:', assessmentId);
      } catch (err) {
        console.error('[create-checkout] SUPABASE INSERT FAILED - FULL ERROR:', JSON.stringify(err, null, 2));
        console.error('[create-checkout] Error message:', err instanceof Error ? err.message : String(err));
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: PRICES[tier],
            product_data: {
              name: `RetireEngine ${tier === 'premium' ? 'Premium' : 'Standard'} Retirement Blueprint`,
              description: `Personalized ${tier === 'premium' ? '11' : '8'}-page PDF report for ${name}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/assessment/report?session={CHECKOUT_SESSION_ID}&tier=${tier}&email=${encodeURIComponent(email)}`,
      cancel_url: `${siteUrl}/assessment/checkout?tier=${tier}`,
      metadata: {
        assessmentId: assessmentId ?? '',
        tier,
        email,
        name,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout] Error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

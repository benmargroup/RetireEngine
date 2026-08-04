import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
    console.warn('[stripe-webhook] No webhook secret configured — skipping verification');
    return NextResponse.json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { assessmentId, tier, email, name } = session.metadata ?? {};

    // Update Supabase payment status
    if (assessmentId) {
      try {
        const { createServiceClient } = await import('@/lib/supabase');
        const supabase = createServiceClient();
        await supabase
          .from('assessments')
          .update({ payment_confirmed: true, stripe_payment_id: session.id })
          .eq('id', assessmentId);
      } catch (err) {
        console.warn('[stripe-webhook] Supabase update failed (non-fatal):', err);
      }
    }

    // Trigger report generation + email
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
      await fetch(`${siteUrl}/api/send-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, tier, email, name, sessionId: session.id }),
      });
    } catch (err) {
      console.error('[stripe-webhook] send-report trigger failed:', err);
    }
  }

  return NextResponse.json({ received: true });
}

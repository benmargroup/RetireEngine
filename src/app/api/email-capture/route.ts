import { NextResponse } from 'next/server';

const IS_PLACEHOLDER = (key: string | undefined) =>
  !key || key.startsWith('your_') || key.startsWith('https://your');

export async function POST(req: Request) {
  try {
    const { email, emailConsent } = await req.json() as { email: string; emailConsent: boolean };

    if (!email || !emailConsent) {
      return NextResponse.json({ error: 'Missing email or consent' }, { status: 400 });
    }

    // Graceful dev fallback
    if (IS_PLACEHOLDER(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      console.info('[email-capture] Supabase not configured — dev mode, skipping insert');
      return NextResponse.json({ ok: true, devMode: true });
    }

    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();
    const { error } = await supabase.from('email_captures').insert({
      email,
      email_consent: emailConsent,
      captured_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[email-capture] Supabase insert error:', error);
      return NextResponse.json({ error: 'Could not save email' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email-capture] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

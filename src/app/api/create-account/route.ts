import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, password, sessionId } = (await req.json()) as {
      email: string;
      password: string;
      sessionId: string;
    };

    if (!email || !password || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();

    // Create the account pre-confirmed — they already verified this email via
    // the Stripe purchase, no need to make them re-verify it again.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      const message = authError?.message ?? 'Could not create account';
      const status = message.toLowerCase().includes('already') ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    // Link this new account to the assessment they just purchased, found via
    // the Stripe session ID the webhook already stored on that row.
    const { error: linkError } = await supabase
      .from('assessments')
      .update({ user_id: authData.user.id })
      .eq('stripe_payment_id', sessionId);

    if (linkError) {
      console.error('[create-account] Failed to link assessment (non-fatal):', linkError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[create-account] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
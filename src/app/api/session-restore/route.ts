import { NextResponse } from 'next/server';

const IS_PLACEHOLDER = (key: string | undefined) =>
  !key || key.startsWith('your_') || key.startsWith('https://your');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    if (IS_PLACEHOLDER(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('email_captures')
      .select('assessment_data')
      .eq('session_token', token)
      .single();

    if (error || !data?.assessment_data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(data.assessment_data);
  } catch (err) {
    console.error('[session-restore] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
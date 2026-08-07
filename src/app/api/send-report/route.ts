import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const IS_PLACEHOLDER = (key: string | undefined) =>
  !key || key.startsWith('your_') || key.startsWith('re_placeholder') || key === 'placeholder';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tier = (searchParams.get('tier') ?? 'standard') as 'standard' | 'premium';
  const email = searchParams.get('email') ?? '';

  try {
    const { generateReportBuffer } = await import('@/lib/pdf-generator');
    const buffer = await generateReportBuffer({ tier, email, assessmentData: null });

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="RetireEngine-Blueprint-${tier}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[send-report GET] PDF generation error:', err);
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { assessmentId, tier, email, name } = await req.json() as {
      assessmentId?: string;
      tier: 'standard' | 'premium';
      email: string;
      name: string;
      sessionId?: string;
    };

    // Fetch assessment data from Supabase if available
    let assessmentData = null;
    if (assessmentId && !IS_PLACEHOLDER(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      try {
        const { createServiceClient } = await import('@/lib/supabase');
        const supabase = createServiceClient();
        const { data } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .single();
        assessmentData = data;
      } catch (err) {
        console.warn('[send-report] Supabase fetch failed (non-fatal):', err);
      }
    }

    const { generateReportBuffer } = await import('@/lib/pdf-generator');
    const buffer = await generateReportBuffer({ tier, email, assessmentData });

    // Send via Resend
    if (!IS_PLACEHOLDER(process.env.RESEND_API_KEY)) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.FROM_EMAIL ?? 'reports@retireengine.com',
        to: email,
        subject: 'Your RetireEngine Retirement Blueprint',
        html: buildEmailHtml(name, tier),
        attachments: [
          {
            filename: `RetireEngine-Blueprint-${tier}.pdf`,
            content: Buffer.from(buffer).toString('base64'),
          },
        ],
      });

      // Mark as sent
      if (assessmentId && !IS_PLACEHOLDER(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
        try {
          const { createServiceClient } = await import('@/lib/supabase');
          const supabase = createServiceClient();
          await supabase.from('assessments').update({ report_sent: true }).eq('id', assessmentId);
        } catch {}
      }
    } else {
      console.info('[send-report] Resend key is placeholder — skipping email send');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[send-report POST] Error:', err);
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
  }
}

function buildEmailHtml(name: string, tier: 'standard' | 'premium'): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Georgia, serif; color: #0A1628; background: #F8F4EE; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px;">
    <h1 style="font-size: 24px; margin-bottom: 8px; color: #0A1628;">
      RetireEngine
    </h1>
    <hr style="border: none; border-top: 1px solid #C9A84C; margin: 16px 0;" />
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${name},</p>
    <p style="margin-bottom: 16px;">
      Your <strong>${tier === 'premium' ? 'Premium (11-page)' : 'Standard (8-page)'} Retirement Abroad Blueprint</strong>
      is attached to this email.
    </p>
    <p style="margin-bottom: 16px;">
      Your report includes personalized country rankings based on your income, assets,
      longevity profile, and priorities — along with visa qualification status for each destination.
    </p>
    <p style="color: #7A8C7E; font-size: 14px; margin-top: 32px;">
      These are educational planning estimates, not financial or legal advice.
      Consult qualified professionals before making relocation decisions.
    </p>
    <p style="color: #7A8C7E; font-size: 12px; margin-top: 24px;">
      © 2026 RetireEngine · retireengine.com
    </p>
  </div>
</body>
</html>`;
}

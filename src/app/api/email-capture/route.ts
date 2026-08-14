import { NextResponse } from 'next/server';
import { formatCurrency } from '@/lib/scoring-engine';
import { randomUUID } from 'crypto';

const IS_PLACEHOLDER = (key: string | undefined) =>
  !key || key.startsWith('your_') || key.startsWith('https://your') || key.startsWith('re_placeholder');

interface TopMatch {
  name: string;
  score: number;
  surplus: number;
  budgetLow: number;
  budgetHigh: number;
}

export async function POST(req: Request) {
  try {
    const { email, emailConsent, topMatches, totalMonthlyIncome, assessmentData } = await req.json() as {
      email: string;
      emailConsent: boolean;
      topMatches?: TopMatch[];
      totalMonthlyIncome?: number;
      assessmentData?: Record<string, unknown>;
    };

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
    const sessionToken = randomUUID();
    const { error } = await supabase.from('email_captures').insert({
      email,
      email_consent: emailConsent,
      captured_at: new Date().toISOString(),
      session_token: sessionToken,
      assessment_data: assessmentData ?? null,
    });

    if (error) {
      console.error('[email-capture] Supabase insert error:', error);
      return NextResponse.json({ error: 'Could not save email' }, { status: 500 });
    }

    // Send the summary email via Resend
    if (!IS_PLACEHOLDER(process.env.RESEND_API_KEY) && topMatches && topMatches.length > 0) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.FROM_EMAIL ?? 'reports@retireengine.com',
          to: email,
          subject: 'Your RetireEngine Summary — Top Matches Inside',
          html: buildSummaryEmailHtml(topMatches, totalMonthlyIncome ?? 0, sessionToken),
        });
      } catch (err) {
        console.error('[email-capture] Resend send failed (non-fatal):', err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email-capture] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function buildSummaryEmailHtml(topMatches: TopMatch[], totalMonthlyIncome: number, sessionToken: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://retireengine.com';

  const matchesHtml = topMatches
    .map((m, i) => {
      const midBudget = (m.budgetLow + m.budgetHigh) / 2;
      const covers = m.surplus >= 0;
      return `
        <div style="margin-bottom:16px; padding:16px; background:#F8F4EE; border-radius:8px;">
          <p style="margin:0 0 4px; font-weight:bold; color:#0A1628;">#${i + 1} ${m.name} — ${m.score}/100</p>
          <p style="margin:0; font-size:14px; color:#475569;">
            Comfortable budget: ${formatCurrency(m.budgetLow)}\u2013${formatCurrency(m.budgetHigh)}/mo
          </p>
          <p style="margin:4px 0 0; font-size:14px; color:${covers ? '#059669' : '#DC2626'};">
            ${covers ? `+${formatCurrency(m.surplus)}/mo surplus` : `${formatCurrency(Math.abs(m.surplus))}/mo below comfortable`}
          </p>
        </div>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Georgia, serif; color: #0A1628; background: #F8F4EE; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px;">
    <h1 style="font-size: 24px; margin-bottom: 8px; color: #0A1628;">RetireEngine</h1>
    <hr style="border: none; border-top: 1px solid #C9A84C; margin: 16px 0;" />
    <p style="font-size: 16px; margin-bottom: 16px;">Here's your quick summary:</p>

    <h2 style="font-size: 16px; margin-bottom: 8px;">Your Top Matches</h2>
    ${matchesHtml}

    <h2 style="font-size: 16px; margin: 24px 0 8px;">Your Monthly Income</h2>
    <p style="font-size: 14px; color: #475569;">${formatCurrency(totalMonthlyIncome)}/month across all sources</p>

    <div style="margin-top: 32px; text-align: center;">
      <a href="${siteUrl}/assessment/results" style="display:inline-block; background:#C9A84C; color:#0A1628; padding:12px 24px; border-radius:8px; font-weight:bold; text-decoration:none;">
        Unlock Your Full Report →
      </a>
    </div>

    <p style="margin-top: 24px; text-align: center; font-size: 13px; color: #7A8C7E;">
      On a different device? <a href="${siteUrl}/assessment?session=${sessionToken}" style="color: #0A1628; text-decoration: underline;">Continue where you left off</a> — no password needed.
    </p>

    <p style="color: #7A8C7E; font-size: 12px; margin-top: 32px;">
      © 2026 RetireEngine · retireengine.com
    </p>
  </div>
</body>
</html>`;
}
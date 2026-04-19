import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/demo-request
 * Stores a demo booking request in the demo_requests table (if it exists)
 * and logs it. No auth required — public endpoint.
 */
export async function POST(request: NextRequest) {
  let body: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    company: string;
    email: string;
    phone?: string;
    challenges: string;
    consent: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.email || !body.firstName || !body.company) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Try to persist to DB — silently skip if table doesn't exist yet
  try {
    const admin = createAdminClient();
    await admin.from('demo_requests').insert({
      first_name: body.firstName,
      last_name: body.lastName,
      job_title: body.jobTitle,
      company: body.company,
      email: body.email,
      phone: body.phone ?? null,
      challenges: body.challenges,
      consent: body.consent,
    });
  } catch {
    // Non-fatal — log and continue so user always sees success
    console.warn('[demo-request] Could not persist to DB (table may not exist yet)');
  }

  console.log(`[demo-request] New demo request from ${body.email} at ${body.company}`);

  // Send notification email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'RuneSignal Demo <onboarding@resend.dev>',
        to: 'richardgeorgiev76@gmail.com',
        subject: `🎯 New Demo Request — ${body.firstName} ${body.lastName} @ ${body.company}`,
        html: `
          <h2 style="font-family:sans-serif;color:#1a1a2e">New Demo Request</h2>
          <table style="font-family:sans-serif;font-size:15px;border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;color:#666"><b>Name</b></td><td style="padding:8px">${body.firstName} ${body.lastName}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666"><b>Job Title</b></td><td style="padding:8px">${body.jobTitle}</td></tr>
            <tr><td style="padding:8px;color:#666"><b>Company</b></td><td style="padding:8px">${body.company}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666"><b>Email</b></td><td style="padding:8px"><a href="mailto:${body.email}">${body.email}</a></td></tr>
            <tr><td style="padding:8px;color:#666"><b>Phone</b></td><td style="padding:8px">${body.phone || '—'}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666;vertical-align:top"><b>Challenges</b></td><td style="padding:8px">${body.challenges}</td></tr>
          </table>
          <p style="font-family:sans-serif;color:#888;font-size:13px;margin-top:24px">Submitted via runesignal.com/demo</p>
        `,
      });
    } catch (emailErr) {
      console.error('[demo-request] Failed to send notification email:', emailErr);
    }
  } else {
    console.warn('[demo-request] RESEND_API_KEY not set — skipping email notification');
  }

  return NextResponse.json({ success: true });
}

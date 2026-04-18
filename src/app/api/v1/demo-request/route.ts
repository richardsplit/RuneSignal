import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

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

  return NextResponse.json({ success: true });
}

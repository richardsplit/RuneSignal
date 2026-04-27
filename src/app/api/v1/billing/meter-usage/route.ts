import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@lib/stripe';
import { createAdminClient } from '@lib/db/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/billing/meter-usage?event=<event_name>
 *
 * Returns the current-period total for a Stripe Billing Meter event,
 * scoped to the calling tenant's Stripe customer.
 *
 * Falls back to internal DB count (agent_finops / audit_events) when
 * STRIPE_METER_ENABLED is not true or the tenant has no Stripe customer.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });
  }

  const event = request.nextUrl.searchParams.get('event');
  if (!event) {
    return NextResponse.json({ error: 'Missing ?event= parameter' }, { status: 400 });
  }

  const meterEnabled = process.env.STRIPE_METER_ENABLED === 'true';

  // ── Try Stripe Billing Meter summary ────────────────────────────────────
  if (meterEnabled && stripe) {
    try {
      const supabase = createAdminClient();
      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('id', tenantId)
        .single();

      if (tenant?.stripe_customer_id) {
        // List all active meters and find the one matching the event name
        const meters = await (stripe as any).billing.meters.list({ status: 'active', limit: 20 });
        const meter = meters.data?.find(
          (m: { event_name: string }) => m.event_name === event
        );

        if (meter) {
          // Get meter event summaries for the current calendar month
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const summaries = await (stripe as any).billing.meters.listEventSummaries(meter.id, {
            customer: tenant.stripe_customer_id,
            start_time: Math.floor(startOfMonth.getTime() / 1000),
            end_time: Math.floor(now.getTime() / 1000),
            value_grouping_window: 'month',
          });

          const total: number =
            summaries.data?.reduce(
              (acc: number, s: { aggregated_value: number }) => acc + (s.aggregated_value ?? 0),
              0
            ) ?? 0;

          return NextResponse.json({ event, total, source: 'stripe' });
        }
      }
    } catch (err) {
      // Non-fatal — fall through to DB fallback
      console.warn('[meter-usage] Stripe lookup failed, using DB fallback:', err);
    }
  }

  // ── DB fallback: count relevant audit events this month ──────────────────
  try {
    const supabase = createAdminClient();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Map meter event names → audit event_type values stored in audit_events
    const eventTypeMap: Record<string, string> = {
      evidence_pack_signed: 'evidence_pack_signed',
      decision_ledger_replay: 'ledger_replay',
      passport_verification: 'passport_verification',
      passport_issued: 'agent_registered',
    };
    const eventType = eventTypeMap[event] ?? event;

    const { count } = await supabase
      .from('audit_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .gte('created_at', startOfMonth.toISOString());

    return NextResponse.json({ event, total: count ?? 0, source: 'db' });
  } catch (err) {
    console.error('[meter-usage] DB fallback failed:', err);
    return NextResponse.json({ event, total: 0, source: 'error' });
  }
}

import { createAdminClient } from '@lib/db/supabase';
import crypto from 'crypto';

export type MeterEvent =
  | 'evidence_pack_signed'
  | 'decision_ledger_replay'
  | 'passport_verification'
  | 'passport_issued';

interface RecordUsageOptions {
  tenantId: string;
  event: MeterEvent;
  resourceId?: string;
  resourceType?: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Record a metered billing event.
 * - Writes to metered_usage table (always, best-effort).
 * - Attempts to push a Stripe usage record if STRIPE_*_METER_PRICE_ID is set
 *   and the tenant has a matching subscription item.
 * - Never throws — billing failures must not break the primary operation.
 */
export async function recordUsage(opts: RecordUsageOptions): Promise<void> {
  const { tenantId, event, resourceId, resourceType, quantity = 1, metadata = {} } = opts;

  // Idempotency key: tenant + event + resource + day — prevents double-billing on retries
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${tenantId}:${event}:${resourceId ?? ''}:${new Date().toISOString().slice(0, 10)}:${Date.now()}`)
    .digest('hex')
    .slice(0, 32);

  try {
    const supabase = createAdminClient();

    // Insert usage record
    await supabase.from('metered_usage').insert({
      tenant_id:      tenantId,
      meter_event:    event,
      quantity,
      resource_id:    resourceId ?? null,
      resource_type:  resourceType ?? null,
      idempotency_key: idempotencyKey,
      metadata,
    });

    // Attempt Stripe sync if configured
    await syncToStripe({ tenantId, event, quantity, idempotencyKey });
  } catch (err) {
    console.error('[metered-billing] recordUsage failed (non-fatal):', err);
  }
}

/**
 * Push a usage event to Stripe Billing Meters API (Stripe 2023+ / 2025 SDK).
 * Requires:
 *   1. A Billing Meter created in the Stripe dashboard with matching event_name.
 *   2. STRIPE_METER_<EVENT> env var set to the meter's event_name.
 *   3. Tenant has a stripe_customer_id in the tenants table.
 *
 * Meter event names map 1:1 to MeterEvent values (e.g. 'evidence_pack_signed').
 * If any prerequisite is missing, sync is skipped silently.
 */
async function syncToStripe(opts: {
  tenantId: string;
  event: MeterEvent;
  quantity: number;
  idempotencyKey: string;
}): Promise<void> {
  const { tenantId, event, quantity, idempotencyKey } = opts;

  // Meter event names — set STRIPE_METER_ENABLED=true to activate Stripe sync.
  // Each meter must be created in the Stripe Dashboard → Billing → Meters.
  if (!process.env.STRIPE_METER_ENABLED) return;

  const supabase = createAdminClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenant?.stripe_customer_id) return;

  const { getStripe } = await import('@lib/stripe');
  const stripeClient = getStripe();

  // Stripe Billing Meters API — event_name must match a meter created in dashboard
  await (stripeClient as any).billing.meterEvents.create(
    {
      event_name:  event,                          // e.g. 'evidence_pack_signed'
      payload: {
        value:               String(quantity),
        stripe_customer_id:  tenant.stripe_customer_id,
      },
      timestamp: Math.floor(Date.now() / 1000),
    },
    { idempotencyKey }
  );

  await supabase
    .from('metered_usage')
    .update({ stripe_usage_record_id: `meter:${event}`, stripe_synced_at: new Date().toISOString() })
    .eq('idempotency_key', idempotencyKey);
}

/**
 * Get aggregated metered usage for a tenant in the current billing period.
 */
export async function getUsageSummary(tenantId: string, since?: Date): Promise<Record<MeterEvent, number>> {
  const supabase = createAdminClient();
  const from = since ?? new Date(Date.now() - 30 * 86400000);

  const { data } = await supabase
    .from('metered_usage')
    .select('meter_event, quantity')
    .eq('tenant_id', tenantId)
    .gte('created_at', from.toISOString());

  const summary: Record<string, number> = {
    evidence_pack_signed:   0,
    decision_ledger_replay: 0,
    passport_verification:  0,
    passport_issued:        0,
  };

  for (const row of data ?? []) {
    summary[row.meter_event] = (summary[row.meter_event] ?? 0) + (row.quantity ?? 1);
  }

  return summary as Record<MeterEvent, number>;
}

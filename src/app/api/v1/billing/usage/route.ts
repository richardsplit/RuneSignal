import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantId } from '@lib/api/resolve-tenant';
import { getUsageSummary } from '@lib/billing/metered';
import { createAdminClient } from '@lib/db/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/billing/usage
 * Returns metered usage summary for the current billing period.
 * Includes per-event counts, estimated cost, and Stripe sync status.
 */
export async function GET(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get('days') ?? '30'), 90);
  const since = new Date(Date.now() - days * 86400000);

  const supabase = createAdminClient();

  const [summary, catalogRes, rawRes] = await Promise.all([
    getUsageSummary(tenantId, since),
    supabase.from('metered_price_catalog').select('*'),
    supabase
      .from('metered_usage')
      .select('meter_event, quantity, stripe_synced_at, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const catalog = Object.fromEntries(
    (catalogRes.data ?? []).map(r => [r.meter_event, r])
  );

  // Estimate cost using max_price_eur * quantity (conservative estimate)
  const events = Object.entries(summary).map(([event, count]) => {
    const meta = catalog[event];
    const estimatedCost = meta ? Math.round(count * meta.max_price_eur * 100) / 100 : null;
    return {
      event,
      display_name:   meta?.display_name ?? event,
      unit:           meta?.unit ?? 'unit',
      count,
      min_price_eur:  meta?.min_price_eur ?? null,
      max_price_eur:  meta?.max_price_eur ?? null,
      estimated_cost_eur: estimatedCost,
    };
  });

  const totalEstimatedCost = events.reduce((s, e) => s + (e.estimated_cost_eur ?? 0), 0);
  const unsyncedCount = (rawRes.data ?? []).filter(r => !r.stripe_synced_at).length;

  return NextResponse.json({
    period_days:          days,
    period_start:         since.toISOString(),
    period_end:           new Date().toISOString(),
    events,
    total_estimated_cost_eur: Math.round(totalEstimatedCost * 100) / 100,
    unsynced_to_stripe:   unsyncedCount,
    recent_events:        rawRes.data ?? [],
  });
}

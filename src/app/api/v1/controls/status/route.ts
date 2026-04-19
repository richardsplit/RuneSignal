/**
 * GET /api/v1/controls/status — Aggregated control status summary
 *
 * Returns summary counts, per-regulation breakdown, and recent failures.
 *
 * EU AI Act Article 9 — Compliance monitoring controls
 * Phase 4 Task 4.2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { ControlService } from '@lib/services/control-service';
import { resolveTenantId } from '@lib/api/resolve-tenant';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const summary = await ControlService.getStatus(tenantId);

    // Get recent failures from control_evaluations
    const supabase = createAdminClient();
    const { data: recentFailures } = await supabase
      .from('control_evaluations')
      .select('control_id, detail, evaluated_at')
      .eq('tenant_id', tenantId)
      .eq('result', 'fail')
      .order('evaluated_at', { ascending: false })
      .limit(10);

    // Enrich with control name and clause_ref
    const enrichedFailures: Array<{
      control_id: string;
      name: string;
      clause_ref: string | null;
      failed_at: string;
      detail: Record<string, unknown>;
    }> = [];

    for (const f of recentFailures || []) {
      const control = await ControlService.getById(tenantId, f.control_id);
      enrichedFailures.push({
        control_id: f.control_id,
        name: control?.name || 'Unknown',
        clause_ref: control?.clause_ref || null,
        failed_at: f.evaluated_at,
        detail: f.detail as Record<string, unknown>,
      });
    }

    return NextResponse.json({
      summary: {
        total: summary.total,
        passing: summary.passing,
        failing: summary.failing,
        warning: summary.warning,
        not_evaluated: summary.not_evaluated,
      },
      by_regulation: summary.by_regulation,
      recent_failures: enrichedFailures,
    });
  } catch (err) {
    console.error('[controls/status GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

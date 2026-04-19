/**
 * POST /api/v1/controls/:id/evaluate — Trigger on-demand evaluation
 *
 * EU AI Act Article 9 — Compliance monitoring controls
 * Phase 4 Task 4.2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { ControlService } from '@lib/services/control-service';
import { resolveTenantId } from '@lib/api/resolve-tenant';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Verify control exists
    const control = await ControlService.getById(tenantId, id);
    if (!control) {
      return NextResponse.json({ error: 'Control not found' }, { status: 404 });
    }

    const evaluation = await ControlService.evaluate(tenantId, id);

    return NextResponse.json(evaluation);
  } catch (err) {
    console.error('[controls/:id/evaluate POST] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/controls — Create a new compliance control
 * GET  /api/v1/controls — List controls with optional filters
 *
 * EU AI Act Article 9 — Compliance monitoring controls
 * ISO 42001 Clause 8.2 — Operational planning and control
 *
 * Phase 4 Task 4.2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { ControlService } from '@lib/services/control-service';
import type { ControlSeverity, ControlStatus, EvaluationType } from '@lib/types/control';
import { resolveTenantId } from '@lib/api/resolve-tenant';

const VALID_EVALUATION_TYPES: EvaluationType[] = ['real_time', 'scheduled', 'manual'];
const VALID_SEVERITIES: ControlSeverity[] = ['low', 'medium', 'high', 'critical'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (body.evaluation_type && !VALID_EVALUATION_TYPES.includes(body.evaluation_type)) {
      return NextResponse.json(
        { error: `evaluation_type must be one of: ${VALID_EVALUATION_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
      return NextResponse.json(
        { error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` },
        { status: 400 },
      );
    }

    const control = await ControlService.create(tenantId, {
      name: body.name,
      description: body.description,
      regulation: body.regulation,
      clause_ref: body.clause_ref,
      policy_id: body.policy_id,
      evaluation_type: body.evaluation_type,
      evaluation_query: body.evaluation_query,
      evaluation_schedule: body.evaluation_schedule,
      severity: body.severity,
      owner: body.owner,
    });

    return NextResponse.json(control, { status: 201 });
  } catch (err) {
    console.error('[controls POST] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ControlStatus | null;
    const regulation = searchParams.get('regulation');
    const severity = searchParams.get('severity') as ControlSeverity | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await ControlService.list(tenantId, {
      status: status || undefined,
      regulation: regulation || undefined,
      severity: severity || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      controls: result.controls,
      total: result.total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[controls GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

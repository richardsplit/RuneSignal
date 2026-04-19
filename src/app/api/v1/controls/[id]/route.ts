/**
 * GET    /api/v1/controls/:id — Get a single control
 * PATCH  /api/v1/controls/:id — Update a control
 * DELETE /api/v1/controls/:id — Delete a control
 *
 * EU AI Act Article 9 — Compliance monitoring controls
 * Phase 4 Task 4.2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { ControlService } from '@lib/services/control-service';
import type { ControlSeverity, EvaluationType } from '@lib/types/control';
import { resolveTenantId } from '@lib/api/resolve-tenant';

const VALID_EVALUATION_TYPES: EvaluationType[] = ['real_time', 'scheduled', 'manual'];
const VALID_SEVERITIES: ControlSeverity[] = ['low', 'medium', 'high', 'critical'];

export async function GET(
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
    const control = await ControlService.getById(tenantId, id);
    if (!control) {
      return NextResponse.json({ error: 'Control not found' }, { status: 404 });
    }

    return NextResponse.json(control);
  } catch (err) {
    console.error('[controls/:id GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await req.json();

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

    const control = await ControlService.update(tenantId, id, {
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

    return NextResponse.json(control);
  } catch (err) {
    console.error('[controls/:id PATCH] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    await ControlService.delete(tenantId, id);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[controls/:id DELETE] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET  /api/v1/incidents/{id} — Get single incident
 * PATCH /api/v1/incidents/{id} — Update incident (status transition, root_cause, commander)
 *
 * EU AI Act Article 73 — Serious Incident Reporting
 * ISO 42001 Clause 10.2 — Incident Documentation
 *
 * Phase 3 Task 3.1.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { IncidentService } from '@lib/services/incident-service';
import type { IncidentStatus } from '@lib/types/incident';
import { resolveTenantId } from '@lib/api/resolve-tenant';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const incident = await IncidentService.getById(tenantId, id);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json(incident);
  } catch (err) {
    console.error('[incidents/{id} GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const actor = req.headers.get('x-user-id') || 'api';
    let incident = await IncidentService.getById(tenantId, id);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Process fields in order: commander → root_cause → status
    if (body.incident_commander) {
      incident = await IncidentService.assignCommander(tenantId, id, body.incident_commander);
    }

    if (body.root_cause !== undefined) {
      const supabase = createAdminClient();
      const { data: updated, error } = await supabase
        .from('incidents')
        .update({
          root_cause: body.root_cause,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw new Error(`Failed to update root_cause: ${error.message}`);
      incident = updated as typeof incident;

      await IncidentService.addTimelineEntry(id, 'root_cause_updated', actor, {
        root_cause: body.root_cause,
      });
    }

    if (body.status) {
      incident = await IncidentService.transition(
        tenantId,
        id,
        body.status as IncidentStatus,
        actor,
      );
    }

    return NextResponse.json(incident);
  } catch (err: any) {
    if (err?.message?.startsWith('Invalid transition')) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err?.message === 'Incident not found') {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    console.error('[incidents/{id} PATCH] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

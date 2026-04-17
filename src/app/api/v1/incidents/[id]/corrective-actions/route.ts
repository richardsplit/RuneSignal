/**
 * POST  /api/v1/incidents/{id}/corrective-actions — Add a corrective action
 * PATCH /api/v1/incidents/{id}/corrective-actions — Mark a corrective action as done
 *
 * EU AI Act Article 73 — Serious Incident Reporting
 * ISO 42001 Clause 10.2 — Incident Documentation
 *
 * Phase 3 Task 3.1.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { IncidentService } from '@lib/services/incident-service';
import crypto from 'crypto';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  if (apiKey) {
    const supabase = createAdminClient();
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('tenant_id')
      .eq('key_hash', crypto.createHash('sha256').update(apiKey).digest('hex'))
      .single()
      .catch(() => ({ data: null }));

    if (keyData?.tenant_id) return keyData.tenant_id;
  }

  const headerTenantId = req.headers.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  return null;
}

export async function POST(
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

    if (!body.description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }
    if (!body.owner) {
      return NextResponse.json({ error: 'owner is required' }, { status: 400 });
    }
    if (!body.deadline) {
      return NextResponse.json({ error: 'deadline is required (ISO date)' }, { status: 400 });
    }

    const incident = await IncidentService.addCorrectiveAction(tenantId, id, {
      description: body.description,
      owner: body.owner,
      deadline: body.deadline,
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (err: any) {
    if (err?.message === 'Incident not found') {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    console.error('[incidents/{id}/corrective-actions POST] error:', err);
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

    if (typeof body.index !== 'number') {
      return NextResponse.json({ error: 'index is required (0-based)' }, { status: 400 });
    }
    if (body.status !== 'done') {
      return NextResponse.json({ error: 'status must be "done"' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Load incident
    const { data: current, error: fetchError } = await supabase
      .from('incidents')
      .select('corrective_actions')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const actions = Array.isArray(current.corrective_actions) ? [...current.corrective_actions] : [];
    if (body.index < 0 || body.index >= actions.length) {
      return NextResponse.json({ error: 'Invalid corrective action index' }, { status: 400 });
    }

    actions[body.index] = { ...actions[body.index], status: 'done' };

    const { data: updated, error: updateError } = await supabase
      .from('incidents')
      .update({
        corrective_actions: actions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to update corrective action: ${updateError.message}`);

    // Add timeline entry
    const actor = req.headers.get('x-user-id') || 'api';
    await IncidentService.addTimelineEntry(id, 'corrective_action_completed', actor, {
      index: body.index,
      description: actions[body.index].description,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[incidents/{id}/corrective-actions PATCH] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

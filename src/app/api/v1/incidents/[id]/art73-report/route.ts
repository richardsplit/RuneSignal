/**
 * POST /api/v1/incidents/{id}/art73-report — Generate Article 73 report
 * GET  /api/v1/incidents/{id}/art73-report — Retrieve latest Art 73 report
 *
 * EU AI Act Article 73 — Serious Incident Reporting
 *
 * Phase 3 Task 3.2.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { Art73ReportGenerator } from '@lib/modules/compliance/art73-report';
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

    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    // Validate incident exists and is serious
    const incident = await IncidentService.getById(tenantId, id);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    if (!incident.is_serious_incident) {
      return NextResponse.json(
        { error: 'Article 73 reports can only be generated for serious incidents.' },
        { status: 400 },
      );
    }

    const report = await Art73ReportGenerator.generate(tenantId, id);

    return NextResponse.json(report, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes('not marked as a serious incident')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('[art73-report POST] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const report = await Art73ReportGenerator.getByIncidentId(tenantId, id);
    if (!report) {
      return NextResponse.json(
        { error: 'No Article 73 report found for this incident.' },
        { status: 404 },
      );
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error('[art73-report GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

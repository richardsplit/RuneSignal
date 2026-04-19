/**
 * POST /api/v1/incidents — Create a new compliance incident
 * GET  /api/v1/incidents — List incidents with optional filters
 *
 * EU AI Act Article 73 — Serious Incident Reporting
 * ISO 42001 Clause 10.2 — Incident Documentation
 *
 * Phase 3 Task 3.1.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { IncidentService } from '@lib/services/incident-service';
import type { IncidentSeverity, IncidentCategory } from '@lib/types/incident';
import crypto from 'crypto';

const VALID_SEVERITIES: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
const VALID_CATEGORIES: IncidentCategory[] = [
  'operational', 'safety', 'rights_violation', 'security', 'compliance_gap',
];

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

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!body.severity || !VALID_SEVERITIES.includes(body.severity)) {
      return NextResponse.json(
        { error: `severity is required and must be one of: ${VALID_SEVERITIES.join(', ')}` },
        { status: 400 },
      );
    }
    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `category is required and must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      );
    }
    if (!body.reported_by) {
      return NextResponse.json({ error: 'reported_by is required' }, { status: 400 });
    }
    if (body.is_serious_incident && !body.market_surveillance_authority) {
      return NextResponse.json(
        { error: 'market_surveillance_authority is required when is_serious_incident is true' },
        { status: 400 },
      );
    }

    // Idempotency — deduplicate within a 5-minute window by title+category+reported_by
    const idempotencyKey = req.headers.get('idempotency-key');
    if (idempotencyKey) {
      const supabase = createAdminClient();
      const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('incidents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('title', body.title)
        .eq('category', body.category)
        .eq('reported_by', body.reported_by)
        .gte('created_at', windowStart)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(existing, {
          status: 200,
          headers: { 'Idempotent-Replayed': 'true' },
        });
      }
    }

    const incident = await IncidentService.create({
      tenant_id: tenantId,
      title: body.title,
      description: body.description,
      severity: body.severity,
      category: body.category,
      is_serious_incident: body.is_serious_incident,
      market_surveillance_authority: body.market_surveillance_authority,
      reported_by: body.reported_by,
      related_anomaly_ids: body.related_anomaly_ids,
      related_hitl_ids: body.related_hitl_ids,
      related_agent_ids: body.related_agent_ids,
      related_firewall_ids: body.related_firewall_ids,
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (err) {
    console.error('[incidents POST] error:', err);
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
    const status = searchParams.get('status') as import('@lib/types/incident').IncidentStatus | null;
    const severity = searchParams.get('severity') as IncidentSeverity | null;
    const isSeriousParam = searchParams.get('is_serious_incident');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await IncidentService.list(tenantId, {
      status: status || undefined,
      severity: severity || undefined,
      is_serious_incident: isSeriousParam !== null ? isSeriousParam === 'true' : undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      incidents: result.incidents,
      total: result.total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[incidents GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

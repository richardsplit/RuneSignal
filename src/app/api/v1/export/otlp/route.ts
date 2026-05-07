import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';
import { pushToOtlpCollector, toOtlpLogRecord, toOtlpSpan } from '@lib/export/otlp';

/**
 * POST /api/v1/export/otlp
 * Push recent audit events to a configured OTLP collector (Grafana / Datadog / Splunk).
 * Body: { since?: ISO string, limit?: number, format?: 'logs' | 'spans' | 'both' }
 *
 * GET /api/v1/export/otlp
 * Pull endpoint — returns OTLP-formatted payload for scrape-based collectors.
 *
 * EU AI Act Article 12 — record-keeping.
 */
export async function POST(request: NextRequest) {
  if (process.env.OTLP_ENABLED !== 'true') {
    return NextResponse.json({ error: 'OTLP export is not enabled. Set OTLP_ENABLED=true.' }, { status: 403 });
  }

  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { since?: string; limit?: number; format?: 'logs' | 'spans' | 'both' } = {};
  try { body = await request.json(); } catch { /* defaults */ }

  const since = body.since ? new Date(body.since) : new Date(Date.now() - 24 * 3600 * 1000);
  const limit = Math.min(body.limit ?? 500, 2000);

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from('audit_events')
    .select('id, request_id, tenant_id, event_type, agent_id, action, signature, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = await pushToOtlpCollector(rows ?? []);
  return NextResponse.json({
    exported:    result.exported,
    since:       since.toISOString(),
    otlp_error:  result.error ?? null,
    eu_ai_act:   'Article 12',
  });
}

export async function GET(request: NextRequest) {
  if (process.env.OTLP_ENABLED !== 'true') {
    return NextResponse.json({ error: 'OTLP export is not enabled.' }, { status: 403 });
  }

  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') ?? 'logs') as 'logs' | 'spans' | 'both';
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '200'), 1000);
  const since  = searchParams.get('since')
    ? new Date(searchParams.get('since')!)
    : new Date(Date.now() - 3600 * 1000);

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from('audit_events')
    .select('id, request_id, tenant_id, event_type, agent_id, action, signature, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  const events = rows ?? [];
  const payload: Record<string, unknown> = {};

  if (format === 'logs' || format === 'both') {
    payload.resourceLogs = [{
      resource:  { attributes: [{ key: 'service.name', value: { stringValue: 'runesignal' } }] },
      scopeLogs: [{ scope: { name: 'runesignal.audit' }, logRecords: events.map(toOtlpLogRecord) }],
    }];
  }

  if (format === 'spans' || format === 'both') {
    payload.resourceSpans = [{
      resource:   { attributes: [{ key: 'service.name', value: { stringValue: 'runesignal' } }] },
      scopeSpans: [{ scope: { name: 'runesignal.audit' }, spans: events.map(toOtlpSpan) }],
    }];
  }

  return NextResponse.json({ ...payload, _meta: { total: events.length, since: since.toISOString() } });
}

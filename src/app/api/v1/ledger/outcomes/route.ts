import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';

/**
 * GET  /api/v1/ledger/outcomes  — list outcome labels for tenant
 * POST /api/v1/ledger/outcomes  — ingest an outcome label (manual or webhook)
 */

export async function GET(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const decision_id     = searchParams.get('decision_id');
  const outcome_status  = searchParams.get('outcome_status');
  const limit           = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);

  const supabase = createAdminClient();
  let query = supabase
    .from('decision_outcomes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('labeled_at', { ascending: false })
    .limit(limit);

  if (decision_id)    query = query.eq('decision_id', decision_id);
  if (outcome_status) query = query.eq('outcome_status', outcome_status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ outcomes: data ?? [], total: data?.length ?? 0 });
}

export async function POST(request: NextRequest) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    decision_id:    string;
    outcome_status: string;
    decision_type?: string;
    outcome_source?: string;
    source_ref?:    string;
    source_url?:    string;
    label_notes?:   string;
    labeled_by?:    string;
    metadata?:      Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.decision_id || !body.outcome_status) {
    return NextResponse.json({ error: 'decision_id and outcome_status are required' }, { status: 400 });
  }

  const VALID_STATUSES = ['accepted', 'rejected', 'reversed', 'litigated', 'settled', 'pending'];
  if (!VALID_STATUSES.includes(body.outcome_status)) {
    return NextResponse.json({ error: `outcome_status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('decision_outcomes')
    .insert({
      tenant_id:      tenantId,
      decision_id:    body.decision_id,
      outcome_status: body.outcome_status,
      decision_type:  body.decision_type ?? null,
      outcome_source: body.outcome_source ?? 'manual',
      source_ref:     body.source_ref ?? null,
      source_url:     body.source_url ?? null,
      label_notes:    body.label_notes ?? null,
      labeled_by:     body.labeled_by ?? null,
      metadata:       body.metadata ?? {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ outcome: data }, { status: 201 });
}

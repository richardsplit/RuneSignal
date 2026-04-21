import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';

/**
 * POST /api/v1/ledger/reverse/:decisionId
 * Reversibility orchestrator — initiates a structured reversal workflow for a decision.
 * Supported reversal types: refund | revoke_access | rollback_deploy | retract_filing | custom
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> }
) {
  const { decisionId } = await params;
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    reversal_type: string;
    reason?: string;
    initiated_by?: string;
    actions?: Array<{ type: string; target: string; payload?: Record<string, unknown> }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.reversal_type) {
    return NextResponse.json({ error: 'reversal_type is required' }, { status: 400 });
  }

  const VALID_TYPES = ['refund', 'revoke_access', 'rollback_deploy', 'retract_filing', 'custom'];
  if (!VALID_TYPES.includes(body.reversal_type)) {
    return NextResponse.json({ error: `reversal_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify the decision exists in audit_events or approval_requests
  const [{ data: auditEvent }, { data: hitlApproval }] = await Promise.all([
    supabase.from('audit_events').select('request_id, event_type, agent_id').eq('tenant_id', tenantId).eq('request_id', decisionId).maybeSingle(),
    supabase.from('approval_requests').select('id, status, title').eq('tenant_id', tenantId).eq('id', decisionId).maybeSingle(),
  ]);

  if (!auditEvent && !hitlApproval) {
    return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
  }

  // Check for existing active reversal
  const { data: existing } = await supabase
    .from('decision_reversals')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('decision_id', decisionId)
    .in('status', ['pending', 'executing'])
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'A reversal is already in progress for this decision', existing_reversal_id: existing.id }, { status: 409 });
  }

  // Build default actions if not provided
  const defaultActions: Record<string, Array<{ type: string; target: string }>> = {
    refund:          [{ type: 'issue_refund',       target: decisionId }],
    revoke_access:   [{ type: 'revoke_credentials', target: decisionId }],
    rollback_deploy: [{ type: 'rollback_artifact',  target: decisionId }],
    retract_filing:  [{ type: 'retract_document',   target: decisionId }],
    custom:          [],
  };

  const actions = body.actions ?? defaultActions[body.reversal_type] ?? [];

  const { data: reversal, error } = await supabase
    .from('decision_reversals')
    .insert({
      tenant_id:    tenantId,
      decision_id:  decisionId,
      reversal_type: body.reversal_type,
      status:       'pending',
      initiated_by: body.initiated_by ?? null,
      reason:       body.reason ?? null,
      actions,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Back-label the decision outcome as 'reversed'
  await supabase.from('decision_outcomes').insert({
    tenant_id:      tenantId,
    decision_id:    decisionId,
    outcome_status: 'reversed',
    outcome_source: 'reversal_orchestrator',
    source_ref:     reversal!.id,
    label_notes:    `Reversal initiated: ${body.reversal_type}${body.reason ? ` — ${body.reason}` : ''}`,
    labeled_by:     body.initiated_by ?? 'system',
    metadata:       { reversal_type: body.reversal_type, actions },
  });

  return NextResponse.json({ reversal }, { status: 201 });
}

/**
 * GET /api/v1/ledger/reverse/:decisionId
 * Get the current reversal status for a decision.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> }
) {
  const { decisionId } = await params;
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data: reversals, error } = await supabase
    .from('decision_reversals')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reversals: reversals ?? [], total: reversals?.length ?? 0 });
}

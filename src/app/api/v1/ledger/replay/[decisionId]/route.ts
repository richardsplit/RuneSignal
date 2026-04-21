import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { resolveTenantId } from '@lib/api/resolve-tenant';
import { recordUsage } from '@lib/billing/metered';

/**
 * POST /api/v1/ledger/replay/:decisionId
 * Forensic replay of a decision — returns full reasoning chain, audit trail,
 * outcome labels, and linked reversals. Metered per call.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> }
) {
  const { decisionId } = await params;
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  // Fetch the audit event (core decision record)
  const { data: auditEvent } = await supabase
    .from('audit_events')
    .select('*')
    .eq('request_id', decisionId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  // Fetch certificate explanation if exists (S11 Explainability)
  const { data: explanation } = await supabase
    .from('certificate_explanations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('certificate_id', decisionId)
    .maybeSingle();

  // Fetch outcome labels for this decision
  const { data: outcomes } = await supabase
    .from('decision_outcomes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('decision_id', decisionId)
    .order('labeled_at', { ascending: false });

  // Fetch any reversals
  const { data: reversals } = await supabase
    .from('decision_reversals')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: false });

  // Fetch linked HITL approval if any
  const { data: hitlApproval } = await supabase
    .from('approval_requests')
    .select('id, status, title, priority, resolved_by, resolved_at')
    .eq('tenant_id', tenantId)
    .eq('id', decisionId)
    .maybeSingle();

  if (!auditEvent && !explanation && !hitlApproval) {
    return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
  }

  recordUsage({ tenantId, event: 'ledger_replay', resourceId: decisionId, resourceType: 'decision' });

  const replay = {
    decision_id:   decisionId,
    tenant_id:     tenantId,
    replayed_at:   new Date().toISOString(),
    audit_event:   auditEvent ?? null,
    explanation:   explanation ?? null,
    hitl_approval: hitlApproval ?? null,
    outcomes:      outcomes ?? [],
    reversals:     reversals ?? [],
    outcome_summary: {
      latest_status: outcomes?.[0]?.outcome_status ?? 'unlabeled',
      total_labels:  outcomes?.length ?? 0,
      reversed:      reversals?.some(r => r.status === 'completed') ?? false,
    },
  };

  return NextResponse.json({ replay });
}

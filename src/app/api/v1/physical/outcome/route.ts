import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';
import { AuditLedgerService } from '../../../../../../lib/ledger/service';

/**
 * POST /api/v1/physical/outcome
 * Record the outcome of a physical action after execution.
 * Body: { log_id, outcome: 'success'|'failure'|'partial', outcome_detail? }
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: {
    log_id?: string;
    outcome?: 'success' | 'failure' | 'partial';
    outcome_detail?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { log_id, outcome, outcome_detail = {} } = body;
  if (!log_id || !outcome) {
    return NextResponse.json({ error: 'Missing required: log_id, outcome' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify the log entry belongs to this tenant
  const { data: logEntry } = await supabase
    .from('physical_action_log')
    .select('id, physical_agent_id, action_type, tenant_id')
    .eq('id', log_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!logEntry) {
    return NextResponse.json({ error: 'Physical action log entry not found' }, { status: 404 });
  }

  // Append outcome to audit ledger
  await AuditLedgerService.appendEvent({
    event_type: `physical.action_${outcome}`,
    module: 's15',
    tenant_id: tenantId,
    payload: {
      log_id,
      physical_agent_id: logEntry.physical_agent_id,
      action_type: logEntry.action_type,
      outcome,
      ...outcome_detail,
    },
  });

  return NextResponse.json({
    message: `Outcome '${outcome}' recorded for action log ${log_id}`,
    outcome,
    log_id,
  });
}

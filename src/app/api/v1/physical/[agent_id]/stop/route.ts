import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { AuditLedgerService } from '../../../../../../../lib/ledger/service';

/**
 * POST /api/v1/physical/[agent_id]/stop
 * Emergency stop a physical agent. Sets status to 'emergency_stopped'.
 * Body: { reason }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agent_id: string }> }
) {
  const { agent_id } = await params;
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch { /* no body is fine */ }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('physical_agents')
    .update({ status: 'emergency_stopped' })
    .eq('id', agent_id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Physical agent not found' }, { status: 404 });

  await AuditLedgerService.appendEvent({
    event_type: 'physical.emergency_stop',
    module: 's15',
    tenant_id: tenantId,
    payload: { physical_agent_id: agent_id, reason: body.reason || 'Manual E-STOP' },
  });

  return NextResponse.json({ status: 'emergency_stopped', agent: data });
}

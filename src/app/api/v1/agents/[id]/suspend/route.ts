import { NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { AuditLedgerService } from '../../../../../../../lib/ledger/service';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v1/agents/[id]/suspend
 * Suspends a rogue or compromised agent immediately.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('agent_credentials')
      .update({ status: 'suspended' })
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to suspend agent: ${error.message}`);

    // Audit the suspension
    await AuditLedgerService.appendEvent({
      event_type: 'agent.suspended',
      module: 's6',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: uuidv4(),
      payload: { reason: 'Administrative Suspension', status: 'suspended' }
    });

    return NextResponse.json({ success: true, agent: data });
  } catch (error: any) {
    console.error('Suspension Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

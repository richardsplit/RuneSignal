import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { AuditLedgerService } from '../../../../../../../../lib/ledger/service';

/**
 * POST /api/v1/a2a/session/[id]/close
 * Close an A2A session.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('a2a_sessions')
    .update({ status: 'completed', closed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  await AuditLedgerService.appendEvent({
    event_type: 'a2a.session_closed',
    module: 's16',
    tenant_id: tenantId,
    payload: { session_id: id, message_count: data.message_count },
  });

  return NextResponse.json({ session: data });
}

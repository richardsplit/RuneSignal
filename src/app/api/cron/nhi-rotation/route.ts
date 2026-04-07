import { NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { AuditLedgerService } from '@lib/ledger/service';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Find all active API keys past their expiry
  const { data: expired } = await supabase
    .from('api_keys')
    .select('id, tenant_id, agent_id, key_prefix')
    .eq('is_active', true)
    .lt('expires_at', now);

  let rotated = 0;
  for (const key of (expired || [])) {
    await supabase.from('api_keys')
      .update({ is_active: false })
      .eq('id', key.id);

    await AuditLedgerService.appendEvent({
      event_type: 'nhi.key_auto_expired',
      module: 's12',
      tenant_id: key.tenant_id,
      agent_id: key.agent_id || 'unknown',
      request_id: uuidv4(),
      payload: { key_prefix: key.key_prefix, reason: 'scheduled_expiry' }
    });
    rotated++;
  }

  return NextResponse.json({ success: true, keys_expired: rotated, timestamp: now });
}

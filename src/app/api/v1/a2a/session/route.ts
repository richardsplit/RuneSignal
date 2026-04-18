import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { AuditLedgerService } from '../../../../../../lib/ledger/service';
import { getLedgerSigner } from '../../../../../../lib/ledger/signer';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v1/a2a/session
 * Establish a governed A2A session between two agents.
 * Body: { initiator_id, target_id, task_description, ttl_minutes? }
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: {
    initiator_id?: string;
    target_id?: string;
    task_description?: string;
    ttl_minutes?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { initiator_id, target_id, task_description, ttl_minutes = 60 } = body;
  if (!initiator_id || !target_id || !task_description) {
    return NextResponse.json({
      error: 'Missing required: initiator_id, target_id, task_description'
    }, { status: 400 });
  }

  const signer = getLedgerSigner();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttl_minutes * 60 * 1000).toISOString();

  const dataToSign = `${id}|${initiator_id}|${target_id}|${task_description}|${createdAt}`;
  const signature = signer.sign(Buffer.from(dataToSign, 'utf-8'));

  const supabase = createAdminClient();
  const { data: session, error } = await supabase
    .from('a2a_sessions')
    .insert({
      id,
      tenant_id: tenantId,
      initiator_id,
      target_id,
      task_description,
      status: 'active',
      verdict: 'allowed',
      signature,
      expires_at: expiresAt,
      created_at: createdAt,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await AuditLedgerService.appendEvent({
    event_type: 'a2a.session_established',
    module: 's16',
    tenant_id: tenantId,
    agent_id: initiator_id,
    payload: { session_id: id, initiator_id, target_id, task_description },
  });

  return NextResponse.json({ session }, { status: 201 });
}

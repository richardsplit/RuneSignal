import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../../../lib/db/supabase';
import { getLedgerSigner } from '../../../../../../../../lib/ledger/signer';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * POST /api/v1/a2a/session/[id]/message
 * Relay a governed message within an A2A session.
 * Body: { from_agent_id, to_agent_id, content, message_type? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: {
    from_agent_id?: string;
    to_agent_id?: string;
    content?: string;
    message_type?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { from_agent_id, to_agent_id, content, message_type = 'task' } = body;
  if (!from_agent_id || !to_agent_id || !content) {
    return NextResponse.json({ error: 'Missing required: from_agent_id, to_agent_id, content' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify session exists and is active
  const { data: session } = await supabase
    .from('a2a_sessions')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'active') {
    return NextResponse.json({ error: `Session is ${session.status}` }, { status: 400 });
  }

  const signer = getLedgerSigner();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');
  const dataToSign = `${id}|${params.id}|${contentHash}|${createdAt}`;
  const signature = signer.sign(Buffer.from(dataToSign, 'utf-8'));

  const { data: msg, error } = await supabase
    .from('a2a_messages')
    .insert({
      id,
      session_id: params.id,
      tenant_id: tenantId,
      from_agent_id,
      to_agent_id,
      content_hash: contentHash,
      signature,
      message_type,
      created_at: createdAt,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Increment session message count
  await supabase.from('a2a_sessions').update({ message_count: session.message_count + 1 }).eq('id', params.id);

  return NextResponse.json({ message: msg }, { status: 201 });
}

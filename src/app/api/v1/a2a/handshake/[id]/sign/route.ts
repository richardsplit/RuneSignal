import { NextRequest, NextResponse } from 'next/server';
import { A2AGatewayService } from '../../../../../../../../lib/modules/s16-a2a/service';

/**
 * POST /api/v1/a2a/handshake/[id]/sign
 * Submit an agent's cryptographic signature on an A2A handshake.
 * When both agents have signed, governance checks (S1 + S8) run automatically.
 * Body: { agent_id, signature }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: { agent_id?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { agent_id, signature } = body;
  if (!agent_id || !signature) {
    return NextResponse.json({ error: 'Missing required: agent_id, signature' }, { status: 400 });
  }

  try {
    const result = await A2AGatewayService.signHandshake(tenantId, params.id, agent_id, signature);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

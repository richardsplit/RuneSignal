import { NextRequest, NextResponse } from 'next/server';
import { A2AGatewayService } from '../../../../../../lib/modules/s16-a2a/service';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { handshake_id, agent_id, signature } = body;

    if (!handshake_id || !agent_id || !signature) {
       return NextResponse.json({ error: 'Missing required S16 signature bindings.' }, { status: 400 });
    }

    const result = await A2AGatewayService.signHandshake(tenantId, handshake_id, agent_id, signature);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

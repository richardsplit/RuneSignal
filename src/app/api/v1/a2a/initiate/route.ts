import { NextRequest, NextResponse } from 'next/server';
import { A2AGatewayService } from '../../../../../../lib/modules/s16-a2a/service';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { initiator_id, responder_id, terms } = body;

    if (!initiator_id || !responder_id || !terms) {
       return NextResponse.json({ error: 'Missing required A2A handshake parameters.' }, { status: 400 });
    }

    const result = await A2AGatewayService.initiateHandshake(tenantId, initiator_id, responder_id, terms);
    return NextResponse.json({ success: true, handshake: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

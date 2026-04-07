import { NextRequest, NextResponse } from 'next/server';
import { A2AGatewayService } from '../../../../../../lib/modules/s16-a2a/service';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const list = await A2AGatewayService.listHandshakes(tenantId);
    return NextResponse.json({ handshakes: list });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

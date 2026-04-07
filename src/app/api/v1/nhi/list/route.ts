import { NextRequest, NextResponse } from 'next/server';
import { NHIService } from '../../../../../../lib/modules/s12-nhi/service';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const keys = await NHIService.listAgentKeys(tenantId);
    return NextResponse.json({ keys });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

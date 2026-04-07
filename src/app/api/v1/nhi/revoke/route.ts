import { NextRequest, NextResponse } from 'next/server';
import { NHIService } from '../../../../../../lib/modules/s12-nhi/service';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { key_id, reason = 'Administrative immediate revocation.' } = body;

    if (!key_id) return NextResponse.json({ error: 'key_id required' }, { status: 400 });

    const result = await NHIService.revokeIdentity(tenantId, key_id, reason);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

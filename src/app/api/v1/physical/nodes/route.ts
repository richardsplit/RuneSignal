import { NextRequest, NextResponse } from 'next/server';
import { PhysicalAIService } from '../../../../../../lib/modules/s15-physical/service';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const nodes = await PhysicalAIService.listNodes(tenantId);
    return NextResponse.json({ nodes });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

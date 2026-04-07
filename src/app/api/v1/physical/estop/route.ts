import { NextRequest, NextResponse } from 'next/server';
import { PhysicalAIService } from '../../../../../../lib/modules/s15-physical/service';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { node_id } = body;

    if (!node_id) return NextResponse.json({ error: 'node_id required' }, { status: 400 });

    const result = await PhysicalAIService.triggerEStop(tenantId, node_id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

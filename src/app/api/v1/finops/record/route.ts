import { NextRequest, NextResponse } from 'next/server';
import { FinOpsService } from '../../../../../../lib/modules/s9-finops/service';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  const agentId = request.headers.get('X-Agent-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { model, input_tokens = 0, output_tokens = 0, certificate_id } = body;

    if (!model) return NextResponse.json({ error: 'Missing model parameter' }, { status: 400 });

    const cost = await FinOpsService.recordCost(tenantId, agentId || '', model, input_tokens, output_tokens, certificate_id);

    return NextResponse.json({ success: true, cost_usd: cost });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

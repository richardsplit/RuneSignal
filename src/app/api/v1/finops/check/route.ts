import { NextRequest, NextResponse } from 'next/server';
import { FinOpsService } from '../../../../../../lib/modules/s9-finops/service';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  const agentId = request.headers.get('X-Agent-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { estimated_tokens = 2000, model = 'default' } = body;

    const result = await FinOpsService.checkBudget(tenantId, agentId || '', estimated_tokens, model);

    if (!result.allowed) {
      return NextResponse.json({ error: 'Budget Exceeded', details: result }, { status: 402 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

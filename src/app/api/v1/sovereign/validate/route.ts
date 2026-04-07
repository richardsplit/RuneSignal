import { NextRequest, NextResponse } from 'next/server';
import { DataResidencyValidator } from '@lib/modules/s10-sovereign/validator';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  const agentId = request.headers.get('X-Agent-Id') || undefined;
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const body = await request.json();
  const { provider, model, data_classification } = body;
  if (!provider || !model) {
    return NextResponse.json({ error: 'provider and model are required' }, { status: 400 });
  }

  const result = await DataResidencyValidator.validateCall(
    tenantId, provider, model, data_classification || 'INTERNAL', agentId
  );

  if (!result.allowed) {
    return NextResponse.json(result, { status: 451 }); // 451 = Unavailable For Legal Reasons
  }
  return NextResponse.json(result);
}

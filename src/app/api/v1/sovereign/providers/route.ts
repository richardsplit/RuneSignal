import { NextRequest, NextResponse } from 'next/server';
import { DataResidencyValidator } from '@lib/modules/s10-sovereign/validator';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const dataClass = searchParams.get('data_classification') || 'INTERNAL';

  const providers = await DataResidencyValidator.getCompliantProviders(tenantId, dataClass);
  return NextResponse.json({ providers });
}

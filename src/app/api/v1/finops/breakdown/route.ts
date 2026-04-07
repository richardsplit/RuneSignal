import { NextRequest, NextResponse } from 'next/server';
import { FinOpsService } from '../../../../../../lib/modules/s9-finops/service';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const periodDays = parseInt(searchParams.get('days') || '30', 10);

  try {
    const breakdown = await FinOpsService.getCostBreakdown(tenantId, periodDays);
    return NextResponse.json(breakdown);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

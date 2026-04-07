import { NextRequest, NextResponse } from 'next/server';
import { AnomalyDetectorService } from '@lib/modules/s14-anomaly/service';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const anomalies = await AnomalyDetectorService.getActiveAnomalies(tenantId);
    return NextResponse.json({ anomalies });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { anomaly_id } = body;
    if (!anomaly_id) return NextResponse.json({ error: 'anomaly_id required' }, { status: 400 });

    await AnomalyDetectorService.resolveAnomaly(tenantId, anomaly_id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

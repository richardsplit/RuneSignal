import { NextRequest, NextResponse } from 'next/server';
import { GovernanceIntelService } from '../../../../../../lib/modules/s13-intel/service';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const dashboards = await GovernanceIntelService.getComplianceDashboards(tenantId);
    return NextResponse.json({ frameworks: dashboards });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Optional trigger POST to kickstart automining feature
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const result = await GovernanceIntelService.autoMineEvidence(tenantId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

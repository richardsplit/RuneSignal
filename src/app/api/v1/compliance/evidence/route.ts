import { NextRequest, NextResponse } from 'next/server';
import { GovernanceIntelService } from '../../../../../../lib/modules/s13-intel/service';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const frameworkId = searchParams.get('framework_id');

  if (!frameworkId) return NextResponse.json({ error: 'framework_id is required' }, { status: 400 });

  try {
    const packageData = await GovernanceIntelService.getEvidencePackage(tenantId, frameworkId);
    return NextResponse.json({ controls: packageData });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

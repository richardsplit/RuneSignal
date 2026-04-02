import { NextRequest, NextResponse } from 'next/server';
import { SoulService } from '../../../../../../../lib/modules/s8-moralos/soul';

/**
 * POST /api/v1/moral/verify/[version]
 * Verifies the Ed25519 signature of a specific SOUL version.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const { version } = await params;
    const versionNum = parseInt(version);
    if (isNaN(versionNum)) return NextResponse.json({ error: 'Invalid version' }, { status: 400 });

    const result = await SoulService.verifySoulVersion(tenantId, versionNum);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

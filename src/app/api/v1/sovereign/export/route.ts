import { NextRequest, NextResponse } from 'next/server';
import { SovereignExporterService } from '../../../../../../lib/modules/s10-sovereign/exporter';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');

  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const result = await SovereignExporterService.triggerExport(tenantId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ExplainabilityService } from '../../../../../../lib/modules/s11-explainability/service';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const certificateId = searchParams.get('certificate_id');

  if (!certificateId) return NextResponse.json({ error: 'certificate_id required' }, { status: 400 });

  try {
    let expl = await ExplainabilityService.getExplanation(tenantId, certificateId);
    
    // Auto-generate if it doesn't exist, serving as a lazy-load pattern
    if (!expl) {
        expl = await ExplainabilityService.generateExplanation(tenantId, certificateId);
    }
    
    return NextResponse.json({ explanation: expl });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

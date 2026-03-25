import { NextResponse } from 'next/server';
import { CertificateService } from '../../../../lib/modules/s3-provenance/certificate';
import { VersionMonitor } from '../../../../lib/modules/s3-provenance/version-monitor';

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    const agentId = request.headers.get('X-Agent-Id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
    }

    const body = await request.json();

    // 1. Generate the Provenance Certificate
    const result = await CertificateService.certifyCall(tenantId, agentId, body);

    // 2. Trigger Version Monitor (async out of band to avoid latency)
    // The monitor analyzes the response to detect silent model updates from providers
    VersionMonitor.analyzeAndDetect(tenantId, result.model_version, body.completion_text, body.provider).catch(e => {
       console.error("VersionMonitor error:", e);
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Certification Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

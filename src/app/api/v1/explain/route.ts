import { NextRequest, NextResponse } from 'next/server';
import { ExplainabilityService } from '../../../../../../lib/modules/s11-explainability/service';
import { createAdminClient } from '../../../../../../lib/db/supabase';

/**
 * GET /api/v1/explain
 * - With ?certificate_id=<id>: return a single explanation (auto-generate if missing)
 * - Without certificate_id: return paginated tenant explanation history
 *
 * POST /api/v1/explain
 * Trigger async generation of an explanation.
 * Body: { certificate_id }
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const certificateId = searchParams.get('certificate_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

  // Single lookup by certificate_id
  if (certificateId) {
    try {
      let expl = await ExplainabilityService.getExplanation(tenantId, certificateId);
      if (!expl) {
        expl = await ExplainabilityService.generateExplanation(tenantId, certificateId);
      }
      return NextResponse.json({ explanation: expl });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Tenant history list
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('certificate_explanations')
    .select('id, certificate_id, agent_id, decision_summary, confidence_score, status, regulatory_refs, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ explanations: data || [], count: (data || []).length });
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: { certificate_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.certificate_id) {
    return NextResponse.json({ error: 'Missing certificate_id' }, { status: 400 });
  }

  try {
    const explanation = await ExplainabilityService.generateExplanation(tenantId, body.certificate_id);
    return NextResponse.json({ explanation }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

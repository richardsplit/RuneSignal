import { NextRequest, NextResponse } from 'next/server';
import { DataResidencyValidator } from '../../../../../../lib/modules/s10-sovereign/validator';

/**
 * POST /api/v1/sovereignty/validate
 * Validate a planned LLM call against the tenant's data residency policy.
 *
 * Body: { provider, model, data_classification, agent_id? }
 * Returns: { allowed, provider, model, region, violation_reason?, alternative_provider? }
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  let body: {
    provider?: string;
    model?: string;
    data_classification?: string;
    agent_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { provider, model, data_classification = 'INTERNAL', agent_id } = body;
  if (!provider || !model) {
    return NextResponse.json({ error: 'Missing required fields: provider, model' }, { status: 400 });
  }

  try {
    const result = await DataResidencyValidator.validateCall(
      tenantId, provider, model, data_classification, agent_id
    );
    return NextResponse.json(result, { status: result.allowed ? 200 : 403 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

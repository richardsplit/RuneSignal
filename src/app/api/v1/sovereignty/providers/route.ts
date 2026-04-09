import { NextRequest, NextResponse } from 'next/server';
import { DataResidencyValidator } from '../../../../../../lib/modules/s10-sovereign/validator';

/**
 * GET /api/v1/sovereignty/providers?data_classification=PII
 * Returns all LLM providers compliant with the tenant's data residency policy.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dataClass = searchParams.get('data_classification') || 'INTERNAL';

  try {
    const providers = await DataResidencyValidator.getCompliantProviders(tenantId, dataClass);
    return NextResponse.json({ providers, data_classification: dataClass });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

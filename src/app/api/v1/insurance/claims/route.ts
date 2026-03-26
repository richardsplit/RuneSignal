import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';
import { AuditLedgerService } from '../../../../../../lib/ledger/service';
import { RiskEngine } from '../../../../../../lib/modules/s5-insurance/risk-engine';

/**
 * GET /api/v1/insurance/claims
 * List all insurance claims for the tenant.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('insurance_claims')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

/**
 * POST /api/v1/insurance/claims
 * File a new insurance claim.
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Fetch agent risk profile for initial scoring
    const { data: profile } = await supabase
      .from('agent_risk_profiles')
      .select('*')
      .eq('agent_id', body.agent_id)
      .single();

    const fraudData = RiskEngine.computeFraudScore(profile || { total_violations: 0, model_version_anomalies: 0 }, 1);
    const complianceData = RiskEngine.applyComplianceRules(body);

    const { data: claim, error } = await supabase
      .from('insurance_claims')
      .insert({
        tenant_id: tenantId,
        agent_id: body.agent_id,
        incident_type: body.incident_type,
        financial_impact: body.financial_impact,
        description: body.description,
        claim_state: 'filed',
        fraud_score: fraudData.score,
        compliance_metadata: complianceData.compliance_metadata
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Audit the claim filing
    await AuditLedgerService.appendEvent({
      event_type: 'insurance.claim_filed',
      module: 's5',
      tenant_id: tenantId,
      agent_id: body.agent_id,
      request_id: claim.id,
      payload: { 
        type: body.incident_type, 
        impact: body.financial_impact, 
        claim_state: 'filed',
        fraud_score: fraudData.score
      }
    });

    return NextResponse.json(claim);
  } catch (error: any) {
    console.error('Claim Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/../lib/db/supabase';
import { AuditLedgerService } from '@/../lib/ledger/service';

/**
 * GET /api/v1/insurance/claims
 * List recent claims for the tenant.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('insurance_claims')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('filed_at', { ascending: false })
    .limit(20);

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

    const { data: claim, error } = await supabase
      .from('insurance_claims')
      .insert({
        tenant_id: tenantId,
        agent_id: body.agent_id,
        incident_type: body.incident_type,
        financial_impact: body.financial_impact,
        description: body.description,
        status: 'filed'
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
        status: 'filed' 
      }
    });

    return NextResponse.json(claim);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

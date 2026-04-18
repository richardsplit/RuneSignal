import { NextResponse } from 'next/server';
import { RiskEngine } from '../../../../../lib/modules/s5-insurance/risk-engine';
import { createAdminClient } from '@lib/db/supabase';

// GET: Retrieve risk profiles and premiums for a specific agent or all agents
export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');

    if (agentId) {
      // Calculate specific premium and refresh risk profile
      const premiumData = await RiskEngine.calculatePremium(tenantId, agentId);
      return NextResponse.json(premiumData);
    }

    // List all risk profiles
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('agent_risk_profiles')
      .select('*, agent_credentials(agent_name)')
      .eq('tenant_id', tenantId)
      .order('risk_score', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ profiles: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: File an Insurance Claim
export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Authentication' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.agent_id || !body.incident_type || !body.financial_impact) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('insurance_claims')
      .insert({
        tenant_id: tenantId,
        agent_id: body.agent_id,
        incident_type: body.incident_type,
        financial_impact: body.financial_impact,
        description: body.description || ''
      })
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ message: 'Claim filed successfully for investigation', claim: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

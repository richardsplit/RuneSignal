import { NextRequest, NextResponse } from 'next/server';
import { RiskEngine } from '@/../lib/modules/s5-insurance/risk-engine';
import { createAdminClient } from '@/../lib/db/supabase';

/**
 * GET /api/v1/insurance/risk
 * List all agent risk profiles for the tenant.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('agent_risk_profiles')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

/**
 * POST /api/v1/insurance/risk
 * Trigger a fleet-wide risk recalculation.
 */
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  const supabase = createAdminClient();
  
  // Get all agents for this tenant
  const { data: agents } = await supabase
    .from('agent_credentials')
    .select('id')
    .eq('tenant_id', tenantId);

  if (!agents) return NextResponse.json({ processed: 0 });

  const results = [];
  for (const agent of agents) {
    try {
      const profile = await RiskEngine.refreshAgentRiskProfile(tenantId, agent.id);
      results.push(profile);
    } catch (e) {
      console.error(`Failed to refresh risk for agent ${agent.id}:`, e);
    }
  }

  return NextResponse.json({ processed: results.length, profiles: results });
}

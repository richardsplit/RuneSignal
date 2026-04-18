import { NextRequest, NextResponse } from 'next/server';
import { FinOpsService } from '../../../../../../lib/modules/s9-finops/service';
import { createAdminClient } from '@lib/db/supabase';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { agent_id, budget_usd, scope_type, hard_block, alert_at } = body;

    const result = await FinOpsService.setBudget(tenantId, agent_id || null, budget_usd, scope_type, hard_block, alert_at);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { data: budgets } = await supabase.from('agent_budgets').select('*').eq('tenant_id', tenantId);
    return NextResponse.json(budgets || []);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

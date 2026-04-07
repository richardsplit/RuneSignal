import { NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Reset monthly budget counters for tenants past their billing cycle
  const supabase = createAdminClient();
  const { data: budgets } = await supabase
    .from('agent_budgets')
    .select('id, tenant_id, resets_at, scope_type')
    .eq('scope_type', 'monthly')
    .lt('resets_at', new Date().toISOString());

  let reset = 0;
  for (const budget of (budgets || [])) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    await supabase.from('agent_budgets')
      .update({ spent_usd: 0, resets_at: nextReset.toISOString() })
      .eq('id', budget.id);
    reset++;
  }

  return NextResponse.json({ success: true, budgets_reset: reset, timestamp: new Date().toISOString() });
}

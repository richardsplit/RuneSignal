import { NextResponse } from 'next/server';
import { GovernanceIntelService } from '@lib/modules/s13-intel/service';
import { createAdminClient } from '@lib/db/supabase';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: tenants } = await supabase.from('tenants').select('id');

  let totalMapped = 0;
  for (const tenant of (tenants || [])) {
    const result = await GovernanceIntelService.autoMineEvidence(tenant.id);
    totalMapped += result.mapped;
  }

  return NextResponse.json({ success: true, total_evidence_mapped: totalMapped, timestamp: new Date().toISOString() });
}

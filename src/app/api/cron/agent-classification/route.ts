/**
 * Cron: Agent EU AI Act Classification
 *
 * Weekly (Sundays 3 AM UTC) — reclassifies all agents for every tenant.
 * Skips agents with manual overrides.
 *
 * EU AI Act Annex III — ongoing risk reassessment
 * Phase 5 Task 5.2.1
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { AgentClassificationService } from '@lib/services/agent-classification-service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: tenants } = await supabase.from('tenants').select('id');

  let totalClassified = 0;
  const errors: string[] = [];

  for (const tenant of tenants || []) {
    try {
      const results = await AgentClassificationService.classifyAll(tenant.id);
      totalClassified += results.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`tenant ${tenant.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    total_classified: totalClassified,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}

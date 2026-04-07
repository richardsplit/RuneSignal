import { NextResponse } from 'next/server';
import { AnomalyDetectorService } from '@lib/modules/s14-anomaly/service';
import { createAdminClient } from '@lib/db/supabase';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // last 15 minutes

  // Get all agents with recent activity
  const { data: recentAgents } = await supabase
    .from('cost_events')
    .select('tenant_id, agent_id, cost_usd, input_tokens, output_tokens')
    .gte('created_at', since);

  let anomaliesDetected = 0;

  for (const event of (recentAgents || [])) {
    if (!event.agent_id) continue;
    const result = await AnomalyDetectorService.observeMetric(
      event.tenant_id, event.agent_id, 'cost_spike', Number(event.cost_usd)
    );
    if (result) anomaliesDetected++;

    await AnomalyDetectorService.observeMetric(
      event.tenant_id, event.agent_id, 'token_volume',
      (Number(event.input_tokens) || 0) + (Number(event.output_tokens) || 0)
    );
  }

  return NextResponse.json({ success: true, anomalies_detected: anomaliesDetected, timestamp: new Date().toISOString() });
}

import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';
import { HitlService } from '../s7-hitl/service';

const ANOMALY_THRESHOLDS = {
  cost_spike: { zScore: 2.5, severity: 'high' },
  token_volume: { zScore: 3.0, severity: 'medium' },
  error_rate: { zScore: 2.0, severity: 'critical' },
  velocity: { zScore: 2.5, severity: 'high' },
};

export class AnomalyDetectorService {
  /**
   * Welford's online algorithm for streaming mean/stddev updates
   * without re-scanning historical data.
   */
  private static welfordUpdate(mean: number, stddev: number, n: number, newValue: number) {
    const newN = n + 1;
    const delta = newValue - mean;
    const newMean = mean + delta / newN;
    const delta2 = newValue - newMean;
    // stddev stored as running sum of squares -> convert to actual stddev on read
    const newM2 = stddev * stddev * (n > 0 ? n - 1 : 0) + delta * delta2;
    const newStddev = newN > 1 ? Math.sqrt(newM2 / (newN - 1)) : 0;
    return { mean: newMean, stddev: newStddev, n: newN };
  }

  /**
   * Update the running baseline for a metric, then check for anomaly.
   */
  static async observeMetric(tenantId: string, agentId: string, metricName: string, value: number) {
    const supabase = createAdminClient();

    // Get or create baseline
    const { data: existing } = await supabase
      .from('anomaly_baselines')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .eq('metric_name', metricName)
      .single();

    const prevMean = existing?.mean || 0;
    const prevStddev = existing?.stddev || 0;
    const prevN = existing?.sample_count || 0;

    const updated = this.welfordUpdate(prevMean, prevStddev, prevN, value);

    await supabase.from('anomaly_baselines').upsert({
      tenant_id: tenantId,
      agent_id: agentId,
      metric_name: metricName,
      mean: updated.mean,
      stddev: updated.stddev,
      sample_count: updated.n,
      last_updated: new Date().toISOString()
    }, { onConflict: 'tenant_id,agent_id,metric_name' });

    // Need at least 10 samples before anomaly detection is meaningful
    if (updated.n < 10 || updated.stddev === 0) return null;

    const zScore = Math.abs((value - updated.mean) / updated.stddev);
    const threshold = ANOMALY_THRESHOLDS[metricName as keyof typeof ANOMALY_THRESHOLDS];

    if (threshold && zScore >= threshold.zScore) {
      const { data: anomaly } = await supabase.from('anomaly_events').insert({
        tenant_id: tenantId,
        agent_id: agentId,
        anomaly_type: metricName,
        z_score: zScore,
        baseline_value: updated.mean,
        observed_value: value,
        severity: threshold.severity
      }).select().single();

      // Append to immutable ledger
      await AuditLedgerService.appendEvent({
        event_type: 'anomaly.detected',
        module: 's14',
        tenant_id: tenantId,
        agent_id: agentId,
        payload: {
          anomaly_id: anomaly?.id,
          metric: metricName,
          z_score: zScore,
          severity: threshold.severity
        }
      });

      // Auto-respond to critical anomalies
      if (threshold.severity === 'critical') {
        // Suspend the agent via S6
        await supabase.from('agent_credentials')
          .update({ status: 'suspended' })
          .eq('id', agentId)
          .eq('tenant_id', tenantId);

        await AuditLedgerService.appendEvent({
          event_type: 'agent.auto_suspended_anomaly',
          module: 's14',
          tenant_id: tenantId,
          agent_id: agentId,
          request_id: require('uuid').v4(),
          payload: {
            metric: metricName,
            z_score: zScore,
            value,
            mean: updated.mean,
            stddev: updated.stddev
          }
        });

        // Create S7 HITL ticket for human review
        await HitlService.createException(tenantId, agentId, {
          title: `[S14 AUTO-SUSPEND] Critical anomaly: ${metricName} z-score ${zScore.toFixed(2)}`,
          description: `Agent auto-suspended. Metric '${metricName}' deviated ${zScore.toFixed(2)} standard deviations from baseline. Value: ${value}, Mean: ${updated.mean.toFixed(4)}, StdDev: ${updated.stddev.toFixed(4)}.`,
          priority: 'critical',
          context_data: {
            metric: metricName,
            z_score: zScore,
            observed_value: value,
            baseline_mean: updated.mean,
            baseline_stddev: updated.stddev,
            auto_suspended: true
          }
        });
      }

      return anomaly;
    }

    return null;
  }

  /**
   * Called by the cron job to scan recent cost_events and token totals for spikes.
   */
  static async runScanForTenant(tenantId: string) {
    const supabase = createAdminClient();

    // Aggregate last 24h cost per agent
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: costData } = await supabase.from('cost_events')
      .select('agent_id, cost_usd, input_tokens, output_tokens')
      .eq('tenant_id', tenantId)
      .gte('created_at', oneDayAgo);

    if (!costData || costData.length === 0) return 0;

    // Group by agent
    const agentMetrics: Record<string, { cost: number; tokens: number; count: number }> = {};
    for (const row of costData) {
      const key = row.agent_id || 'unbound';
      if (!agentMetrics[key]) agentMetrics[key] = { cost: 0, tokens: 0, count: 0 };
      agentMetrics[key].cost += Number(row.cost_usd);
      agentMetrics[key].tokens += (row.input_tokens || 0) + (row.output_tokens || 0);
      agentMetrics[key].count++;
    }

    let anomaliesFound = 0;
    for (const [agentId, metrics] of Object.entries(agentMetrics)) {
      const costAnomaly = await this.observeMetric(tenantId, agentId, 'cost_spike', metrics.cost);
      const tokenAnomaly = await this.observeMetric(tenantId, agentId, 'token_volume', metrics.tokens);
      const velocityAnomaly = await this.observeMetric(tenantId, agentId, 'velocity', metrics.count);

      if (costAnomaly) anomaliesFound++;
      if (tokenAnomaly) anomaliesFound++;
      if (velocityAnomaly) anomaliesFound++;
    }

    return anomaliesFound;
  }

  static async getActiveAnomalies(tenantId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase.from('anomaly_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  }

  static async resolveAnomaly(tenantId: string, anomalyId: string) {
    const supabase = createAdminClient();
    await supabase.from('anomaly_events')
      .update({ resolved: true })
      .eq('id', anomalyId)
      .eq('tenant_id', tenantId);
  }
}

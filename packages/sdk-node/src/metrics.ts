/**
 * RuneSignal Node SDK — Platform Metrics Resource
 * GET /api/v1/metrics
 */

import { BaseClient } from './client';

export type HealthStatus = 'healthy' | 'at_risk' | 'critical';

export interface PlatformMetrics {
  summary: {
    agents: number;
    activeIntents: number;
    openExceptions: number;
    violationsToday: number;
  };
  approvals: {
    open: number;
    approvedToday: number;
    autoApprovedToday: number;
    slaBreached: number;
  };
  incidents: {
    open: number;
    serious: number;
  };
  controls: {
    passing: number;
    failing: number;
    overallHealthPct: number;
  };
  finops: {
    budgetUtilizationPct: number;
    costThisMonthUsd: number;
    projectedMonthlyUsd: number;
  };
  healthStatus: HealthStatus;
  asOf: string;
}

export class MetricsResource {
  constructor(private readonly client: BaseClient) {}

  /**
   * Aggregate compliance KPIs for dashboards.
   *
   * @example
   * const m = await client.metrics.get();
   * if (m.healthStatus === 'critical') {
   *   alert('RuneSignal: platform is in a critical state');
   * }
   */
  async get(): Promise<PlatformMetrics> {
    const raw: any = await (this.client as any).request('GET', '/api/v1/metrics');

    return {
      summary: {
        agents:          raw.summary?.agents ?? 0,
        activeIntents:   raw.summary?.active_intents ?? 0,
        openExceptions:  raw.summary?.open_exceptions ?? 0,
        violationsToday: raw.summary?.violations_today ?? 0,
      },
      approvals: {
        open:               raw.approvals?.open ?? 0,
        approvedToday:      raw.approvals?.approved_today ?? 0,
        autoApprovedToday:  raw.approvals?.auto_approved_today ?? 0,
        slaBreached:        raw.approvals?.sla_breached ?? 0,
      },
      incidents: {
        open:    raw.incidents?.open ?? 0,
        serious: raw.incidents?.serious ?? 0,
      },
      controls: {
        passing:          raw.controls?.passing ?? 0,
        failing:          raw.controls?.failing ?? 0,
        overallHealthPct: raw.controls?.overall_health_pct ?? 0,
      },
      finops: {
        budgetUtilizationPct: raw.finops?.budget_utilization_pct ?? 0,
        costThisMonthUsd:     raw.finops?.cost_this_month_usd ?? 0,
        projectedMonthlyUsd:  raw.finops?.projected_monthly_usd ?? 0,
      },
      healthStatus: raw.health_status ?? 'healthy',
      asOf:         raw.as_of ?? new Date().toISOString(),
    };
  }
}

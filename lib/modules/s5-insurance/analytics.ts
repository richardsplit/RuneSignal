/**
 * TrustLayer Risk Analytics
 *
 * Provides time-series risk aggregation and trend analysis for the insurance module.
 * Powers the /api/v1/insurance/analytics endpoint.
 */

import { createAdminClient } from '../../db/supabase';

export interface RiskTrendPoint {
  date: string;        // YYYY-MM-DD
  avg_risk_score: number;
  max_risk_score: number;
  agents_evaluated: number;
  high_risk_agents: number; // score >= 70
}

export interface AgentRiskSummary {
  agent_id: string;
  agent_name: string | null;
  current_risk_score: number;
  avg_risk_score_30d: number;
  trend: 'improving' | 'stable' | 'worsening';
  violations_30d: number;
  last_evaluated: string | null;
}

export interface RiskAnalyticsResult {
  period: { from: string; to: string };
  overall: {
    avg_risk_score: number;
    max_risk_score: number;
    total_agents: number;
    high_risk_agents: number;
    risk_trend: 'improving' | 'stable' | 'worsening';
  };
  trend_30d: RiskTrendPoint[];
  trend_60d: RiskTrendPoint[];
  trend_90d: RiskTrendPoint[];
  agent_summaries: AgentRiskSummary[];
  risk_distribution: {
    low: number;    // score 0-29
    medium: number; // score 30-69
    high: number;   // score 70-89
    critical: number; // score 90+
  };
}

export class RiskAnalytics {
  static async getAnalytics(tenantId: string): Promise<RiskAnalyticsResult> {
    const supabase = createAdminClient();

    const now = new Date();
    const to = now.toISOString();
    const from90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch firewall evaluations with risk scores + agent info in parallel
    const [firewallResult, agentsResult] = await Promise.allSettled([
      supabase
        .from('firewall_evaluations')
        .select('agent_id, risk_score, verdict, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', from90)
        .order('created_at', { ascending: true })
        .limit(50000),

      supabase
        .from('registered_agents')
        .select('id, name, status')
        .eq('tenant_id', tenantId),
    ]);

    const evals =
      firewallResult.status === 'fulfilled' ? firewallResult.value.data || [] : [];
    const agents =
      agentsResult.status === 'fulfilled' ? agentsResult.value.data || [] : [];

    const agentNames = new Map(agents.map(a => [a.id, a.name]));

    // ── Build daily aggregations ──────────────────────────────────────────────
    const buildTrend = (daysBack: number): RiskTrendPoint[] => {
      const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      const filtered = evals.filter(e => new Date(e.created_at as string) >= cutoff);

      // Group by date
      const byDay = new Map<string, { scores: number[]; agents: Set<string> }>();
      for (const e of filtered) {
        const day = (e.created_at as string).slice(0, 10);
        if (!byDay.has(day)) byDay.set(day, { scores: [], agents: new Set() });
        byDay.get(day)!.scores.push(e.risk_score as number);
        byDay.get(day)!.agents.add(e.agent_id as string);
      }

      // Fill in missing days
      const points: RiskTrendPoint[] = [];
      for (let d = 0; d < daysBack; d++) {
        const date = new Date(cutoff.getTime() + d * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const entry = byDay.get(date);
        if (entry && entry.scores.length > 0) {
          const avg =
            Math.round(
              (entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length) * 10
            ) / 10;
          points.push({
            date,
            avg_risk_score: avg,
            max_risk_score: Math.max(...entry.scores),
            agents_evaluated: entry.agents.size,
            high_risk_agents: entry.scores.filter(s => s >= 70).length,
          });
        } else {
          points.push({
            date,
            avg_risk_score: 0,
            max_risk_score: 0,
            agents_evaluated: 0,
            high_risk_agents: 0,
          });
        }
      }
      return points;
    };

    const trend30 = buildTrend(30);
    const trend60 = buildTrend(60);
    const trend90 = buildTrend(90);

    // ── Overall stats (last 30 days) ──────────────────────────────────────────
    const recent30 = evals.filter(
      e =>
        new Date(e.created_at as string) >=
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    );

    const allScores = recent30.map(e => e.risk_score as number);
    const avgScore =
      allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : 0;
    const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;

    // Risk trend: compare first half vs second half of 30-day window
    const midPoint = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const firstHalf = evals
      .filter(
        e =>
          new Date(e.created_at as string) >=
            new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) &&
          new Date(e.created_at as string) < midPoint
      )
      .map(e => e.risk_score as number);
    const secondHalf = evals
      .filter(e => new Date(e.created_at as string) >= midPoint)
      .map(e => e.risk_score as number);

    const firstAvg =
      firstHalf.length > 0
        ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
        : 0;
    const secondAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
        : 0;

    const overallTrend: 'improving' | 'stable' | 'worsening' =
      secondAvg > firstAvg + 5
        ? 'worsening'
        : secondAvg < firstAvg - 5
        ? 'improving'
        : 'stable';

    // ── Per-agent summaries ───────────────────────────────────────────────────
    const agentScores = new Map<
      string,
      { scores: number[]; violations: number; lastEval: string | null }
    >();

    for (const e of recent30) {
      const aid = e.agent_id as string;
      if (!agentScores.has(aid)) {
        agentScores.set(aid, { scores: [], violations: 0, lastEval: null });
      }
      const entry = agentScores.get(aid)!;
      entry.scores.push(e.risk_score as number);
      if (e.verdict === 'block' || e.verdict === 'escalate') entry.violations++;
      if (!entry.lastEval || e.created_at > entry.lastEval) {
        entry.lastEval = e.created_at as string;
      }
    }

    // Latest score per agent from all 90d (for trend direction)
    const agentScores90 = new Map<string, number[]>();
    for (const e of evals) {
      const aid = e.agent_id as string;
      if (!agentScores90.has(aid)) agentScores90.set(aid, []);
      agentScores90.get(aid)!.push(e.risk_score as number);
    }

    const agentSummaries: AgentRiskSummary[] = Array.from(agentScores.entries()).map(
      ([agentId, data]) => {
        const avg30 =
          data.scores.length > 0
            ? Math.round(
                (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10
              ) / 10
            : 0;
        const current = data.scores[data.scores.length - 1] ?? 0;

        const allAgentScores = agentScores90.get(agentId) || [];
        const midIdx = Math.floor(allAgentScores.length / 2);
        const earlyAvg =
          midIdx > 0
            ? allAgentScores.slice(0, midIdx).reduce((a, b) => a + b, 0) / midIdx
            : 0;
        const lateAvg =
          midIdx > 0
            ? allAgentScores.slice(midIdx).reduce((a, b) => a + b, 0) /
              (allAgentScores.length - midIdx)
            : 0;
        const agentTrend: 'improving' | 'stable' | 'worsening' =
          lateAvg > earlyAvg + 5 ? 'worsening' : lateAvg < earlyAvg - 5 ? 'improving' : 'stable';

        return {
          agent_id: agentId,
          agent_name: agentNames.get(agentId) || null,
          current_risk_score: current,
          avg_risk_score_30d: avg30,
          trend: agentTrend,
          violations_30d: data.violations,
          last_evaluated: data.lastEval,
        };
      }
    );

    agentSummaries.sort((a, b) => b.current_risk_score - a.current_risk_score);

    // ── Risk distribution ─────────────────────────────────────────────────────
    // Use latest score per agent
    const latestScores = new Map<string, number>();
    for (const e of recent30) {
      latestScores.set(e.agent_id as string, e.risk_score as number);
    }
    const scoreValues = Array.from(latestScores.values());
    const distribution = {
      low: scoreValues.filter(s => s < 30).length,
      medium: scoreValues.filter(s => s >= 30 && s < 70).length,
      high: scoreValues.filter(s => s >= 70 && s < 90).length,
      critical: scoreValues.filter(s => s >= 90).length,
    };

    return {
      period: {
        from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        to,
      },
      overall: {
        avg_risk_score: avgScore,
        max_risk_score: maxScore,
        total_agents: agentSummaries.length,
        high_risk_agents: agentSummaries.filter(a => a.current_risk_score >= 70).length,
        risk_trend: overallTrend,
      },
      trend_30d: trend30,
      trend_60d: trend60,
      trend_90d: trend90,
      agent_summaries: agentSummaries.slice(0, 50), // top 50 by risk score
      risk_distribution: distribution,
    };
  }
}

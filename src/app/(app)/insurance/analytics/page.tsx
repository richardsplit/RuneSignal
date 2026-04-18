'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';

interface TrendPoint {
  date: string;
  avg_risk_score: number;
  max_risk_score: number;
  agents_evaluated: number;
  high_risk_agents: number;
}

interface AgentSummary {
  agent_id: string;
  agent_name: string | null;
  current_risk_score: number;
  avg_risk_score_30d: number;
  trend: 'improving' | 'stable' | 'worsening';
  violations_30d: number;
  last_evaluated: string | null;
}

interface Analytics {
  period: { from: string; to: string };
  overall: {
    avg_risk_score: number;
    max_risk_score: number;
    total_agents: number;
    high_risk_agents: number;
    risk_trend: 'improving' | 'stable' | 'worsening';
  };
  trend_30d: TrendPoint[];
  trend_60d: TrendPoint[];
  trend_90d: TrendPoint[];
  agent_summaries: AgentSummary[];
  risk_distribution: { low: number; medium: number; high: number; critical: number };
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const h = 48;
  const w = 200;
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={coords} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

function TrendBadge({ trend }: { trend: 'improving' | 'stable' | 'worsening' }) {
  const map = {
    improving: { label: '↓ Improving', cls: 'badge-success' },
    stable: { label: '→ Stable', cls: 'badge-neutral' },
    worsening: { label: '↑ Worsening', cls: 'badge-danger' },
  };
  const { label, cls } = map[trend];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function RiskBar({ score }: { score: number }) {
  const color =
    score < 30 ? 'var(--success)' : score < 70 ? 'var(--warning)' : score < 90 ? 'var(--warning-dark, var(--warning))' : 'var(--danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ width: 80, height: 6, background: 'var(--border-default)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: '0.8125rem', color, fontWeight: 600, width: 28 }}>{score}</span>
    </div>
  );
}

export default function RiskAnalyticsPage() {
  const { tenantId } = useTenant();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendWindow, setTrendWindow] = useState<'30d' | '60d' | '90d'>('30d');

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    fetch('/api/v1/insurance/analytics', {
      headers: { 'X-Tenant-Id': tenantId },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setAnalytics(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const trendData =
    analytics?.[`trend_${trendWindow}` as keyof Analytics] as TrendPoint[] | undefined;

  const dist = analytics?.risk_distribution;
  const total = dist ? dist.low + dist.medium + dist.high + dist.critical : 0;

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Risk Analytics</h1>
        <p className="page-description">30/60/90-day agent risk score trends and violation analysis</p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <p className="t-body-sm text-tertiary">Loading risk analytics…</p>
        </div>
      )}

      {error && <div className="callout callout-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {analytics && (
        <>
          {/* Overall KPIs */}
          <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: '1.5rem' }}>
            {[
              { label: 'Avg Risk Score (30d)', value: analytics.overall.avg_risk_score, color: analytics.overall.avg_risk_score < 30 ? 'var(--success)' : analytics.overall.avg_risk_score < 70 ? 'var(--warning)' : 'var(--danger)' },
              { label: 'Peak Risk Score', value: analytics.overall.max_risk_score, color: analytics.overall.max_risk_score < 70 ? 'var(--warning)' : 'var(--danger)' },
              { label: 'Total Agents', value: analytics.overall.total_agents, color: undefined },
              { label: 'High-Risk Agents', value: analytics.overall.high_risk_agents, color: analytics.overall.high_risk_agents === 0 ? 'var(--success)' : 'var(--danger)' },
            ].map(m => (
              <div key={m.label} className="kpi-card">
                <div className="kpi-label">{m.label}</div>
                <div className="kpi-value" style={m.color ? { color: m.color } : undefined}>{m.value}</div>
              </div>
            ))}
            <div className="kpi-card">
              <div className="kpi-label">Fleet Trend</div>
              <div style={{ marginTop: '0.375rem' }}><TrendBadge trend={analytics.overall.risk_trend} /></div>
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="surface" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Risk Distribution (Last 30 Days)</h3>
            {dist && (
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Low (0–29)', count: dist.low, color: 'var(--success)' },
                  { label: 'Medium (30–69)', count: dist.medium, color: 'var(--warning)' },
                  { label: 'High (70–89)', count: dist.high, color: 'var(--warning)' },
                  { label: 'Critical (90+)', count: dist.critical, color: 'var(--danger)' },
                ].map(d => (
                  <div key={d.label} style={{ minWidth: '100px' }}>
                    <div className="kpi-label" style={{ marginBottom: '0.25rem' }}>{d.label}</div>
                    <div style={{ fontSize: '1.375rem', fontWeight: 700, color: d.color }}>{d.count}</div>
                    <div className="t-caption">{total > 0 ? Math.round((d.count / total) * 100) : 0}% of fleet</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trend Chart */}
          <div className="surface" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Average Risk Score Trend</h3>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {(['30d', '60d', '90d'] as const).map(w => (
                  <button key={w} onClick={() => setTrendWindow(w)} className={`btn ${trendWindow === w ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>{w}</button>
                ))}
              </div>
            </div>
            {trendData && trendData.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                    {trendData.map(p => {
                      const barHeight = Math.max((p.avg_risk_score / 100) * 120, 2);
                      const barColor = p.avg_risk_score < 30 ? 'var(--success)' : p.avg_risk_score < 70 ? 'var(--warning)' : 'var(--danger)';
                      return (
                        <div key={p.date} title={`${p.date}: avg ${p.avg_risk_score}, max ${p.max_risk_score}, ${p.agents_evaluated} agents`} style={{ flex: 1, height: barHeight, background: barColor, opacity: 0.8, borderRadius: '2px 2px 0 0', minWidth: 4, cursor: 'pointer' }} />
                      );
                    })}
                  </div>
                  <div className="t-caption" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    <span>{trendData[0]?.date}</span>
                    <span>{trendData[Math.floor(trendData.length / 2)]?.date}</span>
                    <span>{trendData[trendData.length - 1]?.date}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="t-body-sm text-tertiary" style={{ textAlign: 'center', padding: '2.5rem 0' }}>No evaluation data available for this period</div>
            )}
          </div>

          {/* Agent Summaries Table */}
          <div className="surface" style={{ overflow: 'hidden' }}>
            <div className="panel-header"><span className="panel-title">Agent Risk Summaries</span></div>
            {analytics.agent_summaries.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-body">No agent evaluation data available</p>
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    {['Agent', 'Current Score', 'Avg (30d)', 'Trend', 'Violations (30d)', 'Last Evaluated'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analytics.agent_summaries.map(a => (
                    <tr key={a.agent_id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{a.agent_name || '—'}</div>
                        <div className="t-mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{a.agent_id.slice(0, 8)}…</div>
                      </td>
                      <td><RiskBar score={a.current_risk_score} /></td>
                      <td className="text-secondary">{a.avg_risk_score_30d}</td>
                      <td><TrendBadge trend={a.trend} /></td>
                      <td>
                        <span style={{ color: a.violations_30d === 0 ? 'var(--success)' : a.violations_30d < 5 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
                          {a.violations_30d}
                        </span>
                      </td>
                      <td className="t-caption">{a.last_evaluated ? new Date(a.last_evaluated).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

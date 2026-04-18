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
    improving: { label: '↓ Improving', color: '#10b981' },
    stable: { label: '→ Stable', color: '#737373' },
    worsening: { label: '↑ Worsening', color: '#f43f5e' },
  };
  const { label, color } = map[trend];
  return (
    <span
      style={{
        color,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  const color =
    score < 30 ? '#10b981' : score < 70 ? '#f59e0b' : score < 90 ? '#f97316' : '#f43f5e';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 80,
          height: 6,
          background: '#2a2a2a',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(score, 100)}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
      <span style={{ fontSize: 13, color, fontWeight: 600, width: 28 }}>{score}</span>
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
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#e5e5e5',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '32px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Risk Analytics</h1>
        <p style={{ color: '#737373', fontSize: 14, marginTop: 4 }}>
          30/60/90-day agent risk score trends and violation analysis
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#737373' }}>
          Loading risk analytics…
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#1c0a0a',
            border: '1px solid #7f1d1d',
            borderRadius: 8,
            padding: 16,
            color: '#f87171',
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {analytics && (
        <>
          {/* Overall KPIs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 32,
            }}
          >
            {[
              {
                label: 'Avg Risk Score (30d)',
                value: analytics.overall.avg_risk_score,
                color:
                  analytics.overall.avg_risk_score < 30
                    ? '#10b981'
                    : analytics.overall.avg_risk_score < 70
                    ? '#f59e0b'
                    : '#f43f5e',
              },
              {
                label: 'Peak Risk Score',
                value: analytics.overall.max_risk_score,
                color:
                  analytics.overall.max_risk_score < 70 ? '#f59e0b' : '#f43f5e',
              },
              {
                label: 'Total Agents',
                value: analytics.overall.total_agents,
                color: '#a3a3a3',
              },
              {
                label: 'High-Risk Agents',
                value: analytics.overall.high_risk_agents,
                color:
                  analytics.overall.high_risk_agents === 0 ? '#10b981' : '#f43f5e',
              },
            ].map(m => (
              <div
                key={m.label}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 8,
                  padding: '16px 20px',
                }}
              >
                <div style={{ fontSize: 12, color: '#737373', marginBottom: 6 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: m.color }}>
                  {m.value}
                </div>
              </div>
            ))}
            <div
              style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: 12, color: '#737373', marginBottom: 6 }}>
                Fleet Trend
              </div>
              <TrendBadge trend={analytics.overall.risk_trend} />
            </div>
          </div>

          {/* Risk Distribution */}
          <div
            style={{
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              Risk Distribution (Last 30 Days)
            </div>
            {dist && (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  { label: 'Low (0–29)', count: dist.low, color: '#10b981' },
                  { label: 'Medium (30–69)', count: dist.medium, color: '#f59e0b' },
                  { label: 'High (70–89)', count: dist.high, color: '#f97316' },
                  { label: 'Critical (90+)', count: dist.critical, color: '#f43f5e' },
                ].map(d => (
                  <div key={d.label} style={{ minWidth: 120 }}>
                    <div style={{ fontSize: 12, color: '#737373', marginBottom: 4 }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: d.color }}>
                      {d.count}
                    </div>
                    <div style={{ fontSize: 11, color: '#525252' }}>
                      {total > 0 ? Math.round((d.count / total) * 100) : 0}% of fleet
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trend Chart */}
          <div
            style={{
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Average Risk Score Trend</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['30d', '60d', '90d'] as const).map(w => (
                  <button
                    key={w}
                    onClick={() => setTrendWindow(w)}
                    style={{
                      background: trendWindow === w ? '#10b981' : '#1a1a1a',
                      border: `1px solid ${trendWindow === w ? '#10b981' : '#2a2a2a'}`,
                      borderRadius: 4,
                      color: trendWindow === w ? '#fff' : '#a3a3a3',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {trendData && trendData.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 600 }}>
                  {/* Simple bar chart */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                    {trendData.map(p => {
                      const height = Math.max((p.avg_risk_score / 100) * 120, 2);
                      const color =
                        p.avg_risk_score < 30
                          ? '#10b981'
                          : p.avg_risk_score < 70
                          ? '#f59e0b'
                          : '#f43f5e';
                      return (
                        <div
                          key={p.date}
                          title={`${p.date}: avg ${p.avg_risk_score}, max ${p.max_risk_score}, ${p.agents_evaluated} agents`}
                          style={{
                            flex: 1,
                            height,
                            background: color,
                            opacity: 0.8,
                            borderRadius: '2px 2px 0 0',
                            minWidth: 4,
                            cursor: 'pointer',
                          }}
                        />
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 8,
                      fontSize: 10,
                      color: '#525252',
                    }}
                  >
                    <span>{trendData[0]?.date}</span>
                    <span>{trendData[Math.floor(trendData.length / 2)]?.date}</span>
                    <span>{trendData[trendData.length - 1]?.date}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#525252', fontSize: 13, textAlign: 'center', padding: 40 }}>
                No evaluation data available for this period
              </div>
            )}
          </div>

          {/* Agent Summaries Table */}
          <div
            style={{
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #2a2a2a',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Agent Risk Summaries
            </div>
            {analytics.agent_summaries.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#525252', fontSize: 13 }}>
                No agent evaluation data available
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ background: '#0f0f0f' }}>
                    {[
                      'Agent',
                      'Current Score',
                      'Avg (30d)',
                      'Trend',
                      'Violations (30d)',
                      'Last Evaluated',
                    ].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 16px',
                          textAlign: 'left',
                          color: '#525252',
                          fontWeight: 500,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analytics.agent_summaries.map((a, i) => (
                    <tr
                      key={a.agent_id}
                      style={{
                        borderTop: i > 0 ? '1px solid #1a1a1a' : undefined,
                        background: 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 500 }}>{a.agent_name || '—'}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#525252',
                            fontFamily: 'monospace',
                          }}
                        >
                          {a.agent_id.slice(0, 8)}…
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <RiskBar score={a.current_risk_score} />
                      </td>
                      <td style={{ padding: '10px 16px', color: '#a3a3a3' }}>
                        {a.avg_risk_score_30d}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <TrendBadge trend={a.trend} />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            color:
                              a.violations_30d === 0
                                ? '#10b981'
                                : a.violations_30d < 5
                                ? '#f59e0b'
                                : '#f43f5e',
                            fontWeight: 600,
                          }}
                        >
                          {a.violations_30d}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#525252', fontSize: 12 }}>
                        {a.last_evaluated
                          ? new Date(a.last_evaluated).toLocaleDateString()
                          : '—'}
                      </td>
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

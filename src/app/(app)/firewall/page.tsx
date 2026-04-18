'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface FirewallEvaluation {
  id: string;
  agent_id: string;
  action: string;
  resource: string;
  verdict: 'allow' | 'block' | 'escalate';
  risk_score: number;
  reasons: string[];
  checks: Array<{ check: string; passed: boolean; detail: string; latency_ms: number }>;
  hitl_ticket_id?: string;
  latency_ms: number;
  created_at: string;
}

const VERDICT_CONFIG: Record<FirewallEvaluation['verdict'], { label: string; badgeCls: string; color: string }> = {
  allow:    { label: 'Allow',    badgeCls: 'badge badge-success', color: 'var(--success)' },
  block:    { label: 'Block',    badgeCls: 'badge badge-danger',  color: 'var(--danger)'  },
  escalate: { label: 'Escalate', badgeCls: 'badge badge-warning', color: 'var(--warning)' },
};

function riskColor(score: number) {
  if (score > 75) return 'var(--danger)';
  if (score > 40) return 'var(--warning)';
  return 'var(--success)';
}

export default function FirewallPage() {
  const [evaluations, setEvaluations] = useState<FirewallEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FirewallEvaluation | null>(null);

  const fetchEvaluations = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/firewall/evaluations');
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data);
      }
    } catch (e) {
      console.error('Failed to fetch firewall evaluations', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvaluations();
    const interval = setInterval(fetchEvaluations, 15000);
    return () => clearInterval(interval);
  }, [fetchEvaluations]);

  const total     = evaluations.length;
  const allowed   = evaluations.filter(e => e.verdict === 'allow').length;
  const blocked   = evaluations.filter(e => e.verdict === 'block').length;
  const escalated = evaluations.filter(e => e.verdict === 'escalate').length;
  const avgLatency = total > 0
    ? Math.round(evaluations.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / total)
    : 0;
  const avgRisk = total > 0
    ? Math.round(evaluations.reduce((sum, e) => sum + e.risk_score, 0) / total)
    : 0;

  return (
    <div style={{ maxWidth: '1400px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Action Firewall</h1>
        <p className="page-description">Every AI agent action evaluated in real time — identity, policy, moral, risk.</p>
      </div>

      {/* KPI strip */}
      <div className="kpi-strip" style={{ gridAutoColumns: 'repeat(6, 1fr)' }}>
        {[
          { label: 'Total Evaluations', value: total,              color: undefined },
          { label: 'Allowed',           value: allowed,            color: 'var(--success)'  },
          { label: 'Blocked',           value: blocked,            color: 'var(--danger)'   },
          { label: 'Escalated',         value: escalated,          color: 'var(--warning)'  },
          { label: 'Avg Latency',       value: `${avgLatency}ms`,  color: undefined         },
          { label: 'Avg Risk Score',    value: `${avgRisk}/100`,   color: riskColor(avgRisk) },
        ].map(m => (
          <div key={m.label} className="kpi-card">
            <div className="kpi-label">{m.label}</div>
            <div className="kpi-value" style={m.color ? { color: m.color } : undefined}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Main content: table + detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: '1.5rem' }}>

        {/* Evaluations table */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Recent Evaluations</span>
            <button className="btn btn-ghost btn-sm" onClick={fetchEvaluations}>
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p className="t-body-sm text-tertiary">Loading evaluations…</p>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="empty-state" style={{ margin: '1rem', border: 'none' }}>
              <p className="empty-state-title">No evaluations yet</p>
              <p className="empty-state-body">
                Send your first request to{' '}
                <span className="inline-code">POST /api/v1/firewall/evaluate</span>
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Verdict</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Risk</th>
                    <th>Latency</th>
                    <th>Time</th>
                    <th>HITL</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map(ev => {
                    const vc = VERDICT_CONFIG[ev.verdict];
                    return (
                      <tr
                        key={ev.id}
                        onClick={() => setSelected(ev === selected ? null : ev)}
                        style={{
                          cursor: 'pointer',
                          background: selected?.id === ev.id ? 'var(--accent-soft)' : undefined,
                        }}
                      >
                        <td><span className={vc.badgeCls}>{vc.label}</span></td>
                        <td>
                          <span className="t-mono" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {ev.action}
                          </span>
                        </td>
                        <td>
                          <span className="t-mono" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {ev.resource}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: riskColor(ev.risk_score), fontWeight: 600, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                            {ev.risk_score}/100
                          </span>
                        </td>
                        <td className="text-tertiary t-body-sm">{ev.latency_ms}ms</td>
                        <td className="text-tertiary t-body-sm">
                          {new Date(ev.created_at).toLocaleTimeString()}
                        </td>
                        <td>
                          {ev.hitl_ticket_id && (
                            <span className="badge badge-warning">HITL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="surface" style={{ padding: '1.5rem', alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span className="panel-title">Evaluation Detail</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)} aria-label="Close">✕</button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={VERDICT_CONFIG[selected.verdict].badgeCls} style={{ fontSize: '0.8125rem', padding: '0.3rem 0.625rem' }}>
                {VERDICT_CONFIG[selected.verdict].label}
              </span>
              <span className="t-body-sm text-tertiary">
                Risk: {selected.risk_score}/100 · {selected.latency_ms}ms
              </span>
            </div>

            {[
              { label: 'Action',   value: selected.action },
              { label: 'Resource', value: selected.resource },
              { label: 'Agent',    value: selected.agent_id.slice(0, 16) + '…' },
              { label: 'Eval ID',  value: selected.id.slice(0, 16) + '…' },
            ].map(row => (
              <div key={row.label} style={{ marginBottom: '0.875rem' }}>
                <div className="t-eyebrow" style={{ marginBottom: '0.25rem' }}>{row.label}</div>
                <div className="t-mono" style={{ wordBreak: 'break-all', color: 'var(--text-primary)' }}>{row.value}</div>
              </div>
            ))}

            {selected.reasons.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="t-eyebrow" style={{ marginBottom: '0.5rem' }}>Reasons</div>
                {selected.reasons.map((r, i) => (
                  <div key={i} className="t-body-sm" style={{ color: 'var(--warning)', marginBottom: '0.25rem' }}>
                    · {r}
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="t-eyebrow" style={{ marginBottom: '0.75rem' }}>Check Pipeline</div>
              {selected.checks.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', marginBottom: '0.75rem', padding: '0.625rem', background: 'var(--hover-wash-soft)', borderRadius: 'var(--radius-md)' }}>
                  <span className={`status-dot ${c.passed ? 'online' : 'critical'}`} style={{ marginTop: 4 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="t-eyebrow" style={{ marginBottom: '0.2rem' }}>{c.check}</div>
                    <div className="t-body-sm text-primary" style={{ lineHeight: 1.4 }}>{c.detail}</div>
                    <div className="t-caption">{c.latency_ms}ms</div>
                  </div>
                </div>
              ))}
            </div>

            {selected.hitl_ticket_id && (
              <div className="callout callout-warning" style={{ marginTop: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.8125rem' }}>HITL Ticket Created</div>
                  <div className="t-mono">{selected.hitl_ticket_id}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

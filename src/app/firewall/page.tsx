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

const VERDICT_COLORS: Record<string, string> = {
  allow: 'var(--color-primary-emerald)',
  block: '#ef4444',
  escalate: '#f59e0b',
};

const VERDICT_BADGES: Record<string, string> = {
  allow: '✅ Allow',
  block: '🚫 Block',
  escalate: '⚠️ Escalate',
};

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
    const interval = setInterval(fetchEvaluations, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchEvaluations]);

  // Derived metrics
  const total = evaluations.length;
  const allowed = evaluations.filter(e => e.verdict === 'allow').length;
  const blocked = evaluations.filter(e => e.verdict === 'block').length;
  const escalated = evaluations.filter(e => e.verdict === 'escalate').length;
  const avgLatency = total > 0
    ? Math.round(evaluations.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / total)
    : 0;
  const avgRisk = total > 0
    ? Math.round(evaluations.reduce((sum, e) => sum + e.risk_score, 0) / total)
    : 0;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          🛡️ Action Firewall
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          Every AI agent action evaluated in real time — identity, policy, moral, risk.
        </p>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Evaluations', value: total, color: 'var(--color-text-main)' },
          { label: 'Allowed', value: allowed, color: 'var(--color-primary-emerald)' },
          { label: 'Blocked', value: blocked, color: '#ef4444' },
          { label: 'Escalated', value: escalated, color: '#f59e0b' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, color: 'var(--color-text-main)' },
          { label: 'Avg Risk Score', value: `${avgRisk}/100`, color: avgRisk > 50 ? '#ef4444' : avgRisk > 25 ? '#f59e0b' : 'var(--color-primary-emerald)' },
        ].map(m => (
          <div key={m.label} className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Main content: table + detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: '1.5rem' }}>
        {/* Evaluations table */}
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Recent Evaluations</span>
            <button
              onClick={fetchEvaluations}
              style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading evaluations…</div>
          ) : evaluations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
              <p>No evaluations yet. Send your first request to <code style={{ fontSize: '0.8rem' }}>POST /api/v1/firewall/evaluate</code></p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    {['Verdict', 'Action', 'Resource', 'Risk', 'Latency', 'Time', 'HITL'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map(ev => (
                    <tr
                      key={ev.id}
                      onClick={() => setSelected(ev === selected ? null : ev)}
                      style={{
                        borderBottom: '1px solid var(--border-glass)',
                        cursor: 'pointer',
                        background: selected?.id === ev.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      className="hover-highlight"
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ color: VERDICT_COLORS[ev.verdict], fontWeight: 600, fontSize: '0.8rem' }}>
                          {VERDICT_BADGES[ev.verdict]}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.action}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.resource}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ color: ev.risk_score > 75 ? '#ef4444' : ev.risk_score > 40 ? '#f59e0b' : 'var(--color-primary-emerald)', fontWeight: 600 }}>
                          {ev.risk_score}/100
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{ev.latency_ms}ms</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                        {new Date(ev.created_at).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {ev.hitl_ticket_id && (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            HITL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="glass-panel" style={{ padding: '1.5rem', alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Evaluation Detail</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ color: VERDICT_COLORS[selected.verdict], fontWeight: 700, fontSize: '1.1rem' }}>
                {VERDICT_BADGES[selected.verdict]}
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>
                Risk: {selected.risk_score}/100 · {selected.latency_ms}ms
              </span>
            </div>

            {[
              { label: 'Action', value: selected.action },
              { label: 'Resource', value: selected.resource },
              { label: 'Agent', value: selected.agent_id.slice(0, 16) + '…' },
              { label: 'Eval ID', value: selected.id.slice(0, 16) + '…' },
            ].map(row => (
              <div key={row.label} style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{row.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>{row.value}</div>
              </div>
            ))}

            {selected.reasons.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Reasons</div>
                {selected.reasons.map((r, i) => (
                  <div key={i} style={{ fontSize: '0.82rem', color: '#f59e0b', marginBottom: '0.25rem' }}>• {r}</div>
                ))}
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Check Pipeline</div>
              {selected.checks.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.75rem', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.9rem', marginTop: '1px' }}>{c.passed ? '✅' : '❌'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>{c.check}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-main)', lineHeight: 1.4 }}>{c.detail}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{c.latency_ms}ms</div>
                  </div>
                </div>
              ))}
            </div>

            {selected.hitl_ticket_id && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.25rem' }}>⚠️ HITL Ticket Created</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{selected.hitl_ticket_id}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

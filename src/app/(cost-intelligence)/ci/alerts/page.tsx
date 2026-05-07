'use client';
import { useEffect, useState } from 'react';

interface AnomalyAlert {
  id: string;
  endpoint_id: string;
  z_score: number;
  current_cost_usd: number;
  baseline_mean_usd: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimated_monthly_overrun_usd: number;
  status: 'active' | 'resolved' | 'muted';
  created_at: string;
}

const SEV: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: '🔴 Critical', color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
  high:     { label: '🟠 High',     color: '#f97316', bg: 'rgba(249,115,22,.1)' },
  medium:   { label: '🟡 Medium',   color: '#eab308', bg: 'rgba(234,179,8,.1)' },
  low:      { label: '⚪ Low',      color: '#64748b', bg: 'rgba(100,116,139,.1)' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  useEffect(() => { loadAlerts(); }, [tab]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const url = tab === 'history' ? '/api/ci/anomalies/history' : '/api/ci/anomalies';
      const res = await fetch(url);
      if (res.ok) setAlerts((await res.json()).alerts ?? []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }

  async function runCheck() {
    setRunning(true);
    try {
      const res = await fetch('/api/ci/anomalies/check', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        alert(`Detection ran: ${d.detected} anomalie(s) found.`);
        loadAlerts();
      }
    } catch { /* empty */ }
    finally { setRunning(false); }
  }

  async function resolve(id: string) {
    await fetch(`/api/ci/anomalies/${id}/resolve`, { method: 'PUT' });
    setAlerts(a => a.filter(x => x.id !== id));
  }

  const active = alerts.filter(a => a.status === 'active');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            Anomaly Alerts
          </h1>
          <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            3σ spike detection · 14-day rolling baseline · 15-minute cadence
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['active', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t as 'active' | 'history')}
              style={{ padding: '0.5rem 0.875rem', borderRadius: '0.4rem', fontSize: '0.78rem',
                fontWeight: 600, cursor: 'pointer', border: '1px solid',
                background: tab === t ? 'rgba(99,102,241,.12)' : 'transparent',
                color: tab === t ? '#a5b4fc' : '#475569',
                borderColor: tab === t ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.08)' }}>
              {t === 'active' ? `Active (${active.length})` : 'History'}
            </button>
          ))}
          <button onClick={runCheck} disabled={running}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.4rem', fontSize: '0.78rem',
              fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(99,102,241,.3)',
              background: 'rgba(99,102,241,.1)', color: '#818cf8' }}>
            {running ? 'Checking…' : '▶ Run now'}
          </button>
        </div>
      </div>

      {/* Alert config hint */}
      <div style={{ background: 'rgba(99,102,241,.05)', border: '1px solid rgba(99,102,241,.12)',
        borderRadius: '0.5rem', padding: '0.875rem 1rem', fontSize: '0.78rem', color: '#64748b',
        marginBottom: '1.25rem' }}>
        <strong style={{ color: '#818cf8' }}>Notification channels:</strong> Add{' '}
        <code style={{ background: 'rgba(0,0,0,.2)', padding: '0.1rem 0.3rem',
          borderRadius: '0.2rem' }}>CI_SLACK_WEBHOOK</code> and{' '}
        <code style={{ background: 'rgba(0,0,0,.2)', padding: '0.1rem 0.3rem',
          borderRadius: '0.2rem' }}>CI_PAGERDUTY_KEY</code> to your Railway environment variables to enable push alerts.
      </div>

      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.07)',
        borderRadius: '0.75rem', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Loading…</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
              {tab === 'active' ? 'No active anomalies' : 'No alert history yet'}
            </div>
            <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              {tab === 'active'
                ? 'All endpoints are within 3σ of their 14-day baseline.'
                : 'Alerts will appear here once the detector has enough baseline data (10+ hourly samples).'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                {['Endpoint', 'Z-Score', 'Current/hr', 'Baseline/hr', 'Mo. Overrun', 'Severity', 'When', 'Action'].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: h === 'Endpoint' ? 'left' : 'right',
                    fontSize: '0.72rem', color: '#475569', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a, i) => {
                const sev = SEV[a.severity] ?? SEV.low;
                const ago = Math.round((Date.now() - new Date(a.created_at).getTime()) / 60000);
                return (
                  <tr key={a.id} style={{ borderBottom: i < alerts.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                    background: a.severity === 'critical' ? 'rgba(239,68,68,.02)' : 'transparent' }}>
                    <td style={{ padding: '0.8rem 1rem', fontSize: '0.82rem', color: '#e2e8f0',
                      fontFamily: 'monospace' }}>{a.endpoint_id}</td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 800,
                      color: sev.color, fontSize: '0.9rem' }}>{a.z_score}σ</td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>
                      ${a.current_cost_usd.toFixed(4)}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: '#64748b' }}>
                      ${a.baseline_mean_usd.toFixed(4)}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.85rem',
                      color: '#f97316', fontWeight: 600 }}>
                      ${a.estimated_monthly_overrun_usd?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                        borderRadius: '2rem', background: sev.bg, color: sev.color }}>
                        {sev.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: '#334155' }}>
                      {ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                      {a.status === 'active' && (
                        <button onClick={() => resolve(a.id)}
                          style={{ background: 'none', border: '1px solid rgba(16,185,129,.25)',
                            color: '#10b981', borderRadius: '0.35rem', padding: '0.25rem 0.6rem',
                            fontSize: '0.72rem', cursor: 'pointer' }}>
                          Resolve
                        </button>
                      )}
                      {a.status === 'resolved' && (
                        <span style={{ fontSize: '0.72rem', color: '#10b981' }}>✓ Resolved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

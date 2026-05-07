'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';

interface ProbeResult {
  id:            string;
  category:      string;
  severity:      'low' | 'medium' | 'high' | 'critical';
  name:          string;
  passed:        boolean;
  cvss_ai_score: number;
  detected_by:   string;
  notes:         string;
  executed_at:   string;
}

interface RedTeamReport {
  id:             string;
  agent_id:       string;
  test_suite:     string;
  status:         'pending' | 'running' | 'completed' | 'failed';
  total_probes:   number;
  passed:         number;
  failed:         number;
  critical_count: number;
  high_count:     number;
  cvss_ai_score:  number;
  probe_results?: ProbeResult[];
  signature?:     string;
  created_at:     string;
  completed_at?:  string;
}

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#10b981',
};

const SEV_BG: Record<string, string> = {
  critical: 'rgba(239,68,68,0.12)',
  high:     'rgba(249,115,22,0.12)',
  medium:   'rgba(245,158,11,0.12)',
  low:      'rgba(16,185,129,0.12)',
};

function cvssColor(score: number): string {
  if (score >= 9) return '#ef4444';
  if (score >= 7) return '#f97316';
  if (score >= 4) return '#f59e0b';
  if (score > 0)  return '#10b981';
  return 'var(--text-tertiary)';
}

export default function RedTeamDashboard() {
  const { tenantId } = useTenant();
  const [reports, setReports]       = useState<RedTeamReport[]>([]);
  const [selected, setSelected]     = useState<RedTeamReport | null>(null);
  const [loading, setLoading]       = useState(true);
  const [running, setRunning]       = useState(false);
  const [agentId, setAgentId]       = useState('');
  const [suite, setSuite]           = useState('standard');
  const [error, setError]           = useState('');

  const fetchReports = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res  = await fetch('/api/v1/redteam/run', { headers: { 'X-Tenant-Id': tenantId } });
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId.trim() || !tenantId) return;
    setRunning(true); setError('');
    try {
      const res  = await fetch('/api/v1/redteam/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({ agentId: agentId.trim(), testSuite: suite }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Run failed'); return; }
      setSelected(data.report);
      await fetchReports();
      setAgentId('');
    } catch { setError('Network error'); }
    finally { setRunning(false); }
  };

  const avgPass = reports.length > 0
    ? Math.round(reports.reduce((a, r) => a + (r.passed / Math.max(r.total_probes, 1)) * 100, 0) / reports.length)
    : 0;
  const scoreHex = avgPass >= 80 ? '#10b981' : avgPass >= 50 ? '#f59e0b' : '#ef4444';

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><p className="text-tertiary">Loading…</p></div>;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Red Teaming</h1>
        <p className="page-description">Adversarial probe harness — OWASP LLM Top 10 · EU AI Act Article 15</p>
      </div>

      {/* KPI row + run form */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="surface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-3)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={scoreHex} strokeWidth="10" strokeLinecap="round"
                strokeDasharray="314" strokeDashoffset={314 - (314 * avgPass) / 100}
                style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: scoreHex, lineHeight: 1 }}>{avgPass}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>pass %</span>
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', textAlign: 'center' }}>Fleet defence rate</p>
        </div>

        <div className="surface" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
            {[
              { label: 'Reports', value: reports.length },
              { label: 'Total probes', value: reports.reduce((a, r) => a + r.total_probes, 0) },
              { label: 'Failed probes', value: reports.reduce((a, r) => a + r.failed, 0) },
              { label: 'Critical findings', value: reports.reduce((a, r) => a + r.critical_count, 0) },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</p>
                <p style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleRun} style={{ display: 'flex', gap: '0.6rem' }}>
            <input className="form-input" value={agentId} onChange={e => setAgentId(e.target.value)}
              placeholder="Agent ID" style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem' }} />
            <select className="form-input" value={suite} onChange={e => setSuite(e.target.value)} style={{ width: 130 }}>
              <option value="standard">Standard (12)</option>
              <option value="minimal">Minimal (3)</option>
            </select>
            <button type="submit" className="btn btn-danger" disabled={running} style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
              {running ? 'Running…' : 'Run Probes'}
            </button>
          </form>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
        </div>
      </div>

      {/* Selected report probe details */}
      {selected && (
        <div className="surface" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Report — {selected.agent_id}</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.2rem 0 0' }}>Suite: {selected.test_suite} · CVSS-AI: <span style={{ color: cvssColor(selected.cvss_ai_score), fontWeight: 700 }}>{selected.cvss_ai_score}</span></p>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '1.25rem' }}>×</button>
          </div>
          {/* Severity heat-map */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {(selected.probe_results ?? []).map(p => (
              <div key={p.id} title={`${p.name} — ${p.passed ? 'PASS' : 'FAIL'}`}
                style={{ width: 28, height: 28, borderRadius: 4, background: p.passed ? 'rgba(16,185,129,0.25)' : SEV_BG[p.severity], border: `1.5px solid ${p.passed ? '#10b981' : SEV_COLOR[p.severity]}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: p.passed ? '#10b981' : SEV_COLOR[p.severity], fontWeight: 700 }}
              >{p.passed ? '✓' : '!'}</div>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr><th>ID</th><th>Probe</th><th>Category</th><th>Severity</th><th>Result</th><th>CVSS-AI</th><th>Notes</th></tr></thead>
              <tbody>
                {(selected.probe_results ?? []).map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.id}</td>
                    <td style={{ fontSize: '0.82rem' }}>{p.name}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{p.category}</td>
                    <td><span style={{ color: SEV_COLOR[p.severity], fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>{p.severity}</span></td>
                    <td><span style={{ color: p.passed ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>{p.passed ? 'PASS' : 'FAIL'}</span></td>
                    <td style={{ color: cvssColor(p.cvss_ai_score), fontWeight: 700, fontFamily: 'monospace' }}>{p.cvss_ai_score > 0 ? p.cvss_ai_score : '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report history */}
      {reports.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No reports yet</p>
          <p className="empty-state-body">Enter an Agent ID and run the probe suite.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead><tr><th>Agent</th><th>Suite</th><th>Pass / Total</th><th>Critical</th><th>CVSS-AI</th><th>Status</th><th>Date</th><th /></tr></thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.agent_id}</td>
                  <td style={{ fontSize: '0.78rem' }}>{r.test_suite}</td>
                  <td style={{ fontWeight: 600 }}>{r.passed} / {r.total_probes}</td>
                  <td style={{ color: r.critical_count > 0 ? '#ef4444' : 'var(--text-tertiary)', fontWeight: r.critical_count > 0 ? 700 : 400 }}>{r.critical_count}</td>
                  <td style={{ color: cvssColor(r.cvss_ai_score), fontWeight: 700, fontFamily: 'monospace' }}>{r.cvss_ai_score}</td>
                  <td><span style={{ color: r.status === 'completed' ? '#10b981' : r.status === 'failed' ? '#ef4444' : '#f59e0b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{r.status}</span></td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ fontSize: '0.75rem', color: '#6366f1' }}>View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

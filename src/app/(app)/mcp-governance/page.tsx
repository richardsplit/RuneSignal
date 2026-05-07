'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';

interface McpServer {
  id:             string;
  name:           string;
  endpoint:       string;
  trust_level:    'trusted' | 'verified' | 'untrusted' | 'blocked';
  capabilities:   string[];
  call_count:     number;
  hitl_count:     number;
  blocked_count:  number;
  last_called_at: string | null;
  created_at:     string;
}

const TRUST_COLOR: Record<string, string> = {
  trusted:   '#10b981',
  verified:  '#6366f1',
  untrusted: '#f59e0b',
  blocked:   '#ef4444',
};

export default function McpGovernancePage() {
  const { tenantId } = useTenant();
  const [servers, setServers]     = useState<McpServer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: '', endpoint: '', trust_level: 'untrusted', description: '' });
  const [error, setError]         = useState('');

  const fetchServers = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res  = await fetch('/api/v1/mcp/servers', { headers: { 'X-Tenant-Id': tenantId } });
      const data = await res.json();
      setServers(data.servers ?? []);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !form.name || !form.endpoint) return;
    setAdding(true); setError('');
    try {
      const res  = await fetch('/api/v1/mcp/servers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to register'); return; }
      setShowForm(false);
      setForm({ name: '', endpoint: '', trust_level: 'untrusted', description: '' });
      await fetchServers();
    } catch { setError('Network error'); }
    finally { setAdding(false); }
  };

  const totalCalls = servers.reduce((a, s) => a + s.call_count, 0);
  const totalHitl  = servers.reduce((a, s) => a + s.hitl_count, 0);
  const hitlPct    = totalCalls > 0 ? ((totalHitl / totalCalls) * 100).toFixed(1) : '0.0';

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><p className="text-tertiary">Loading…</p></div>;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">MCP Governance</h1>
          <p className="page-description">Model Context Protocol server registry · EU AI Act Article 26</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancel' : '+ Register Server'}
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Registered Servers', value: servers.length },
          { label: 'Total Invocations', value: totalCalls.toLocaleString() },
          { label: 'HITL Escalations', value: totalHitl.toLocaleString() },
          { label: 'HITL Rate', value: `${hitlPct}%` },
        ].map(kpi => (
          <div key={kpi.label} className="surface" style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.3rem' }}>{kpi.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Register form */}
      {showForm && (
        <div className="surface" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>Register MCP Server</h2>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <input className="form-input" placeholder="Server name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="form-input" placeholder="Endpoint URL" value={form.endpoint} onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))} required />
            <select className="form-input" value={form.trust_level} onChange={e => setForm(f => ({ ...f, trust_level: e.target.value }))}>
              <option value="untrusted">Untrusted</option>
              <option value="verified">Verified</option>
              <option value="trusted">Trusted</option>
              <option value="blocked">Blocked</option>
            </select>
            <input className="form-input" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary" disabled={adding}>{adding ? 'Registering…' : 'Register'}</button>
              {error && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
            </div>
          </form>
        </div>
      )}

      {/* Server list */}
      {servers.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No MCP servers registered</p>
          <p className="empty-state-body">Register a server to start governing tool calls through the proxy layer.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Server</th>
                <th>Endpoint</th>
                <th>Trust</th>
                <th>Calls</th>
                <th>HITL</th>
                <th>HITL Rate</th>
                <th>Last Called</th>
              </tr>
            </thead>
            <tbody>
              {servers.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{s.id.slice(0, 8)}…</div>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.endpoint}</td>
                  <td>
                    <span style={{ color: TRUST_COLOR[s.trust_level], fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {s.trust_level}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.call_count.toLocaleString()}</td>
                  <td style={{ color: s.hitl_count > 0 ? '#f59e0b' : 'var(--text-tertiary)', fontWeight: s.hitl_count > 0 ? 600 : 400 }}>{s.hitl_count.toLocaleString()}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {s.call_count > 0 ? `${((s.hitl_count / s.call_count) * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {s.last_called_at ? new Date(s.last_called_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.5rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
          <strong>EU AI Act Article 26</strong> — Deployer obligations for orchestrated agent systems. All MCP tool calls are intercepted, risk-scored, and logged. High-risk calls (score ≥ 70) are held for HITL approval via <code>POST /api/v1/mcp/invoke</code>.
        </p>
      </div>
    </div>
  );
}

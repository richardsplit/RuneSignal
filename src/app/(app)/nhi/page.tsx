'use client';
import { useState, useEffect } from 'react';

interface AgentKey {
  id: string;
  agent_id: string;
  key_prefix: string;
  is_active: boolean;
  ttl_days: number;
  expires_at: string;
  created_at: string;
  death_certificate_id: string | null;
  status: 'active' | 'expired' | 'revoked';
}

/* ─── Status badge ───────────────────────────────────────────────────── */
function KeyStatusBadge({ status }: { status: AgentKey['status'] }) {
  const map = {
    active:  { cls: 'badge badge-success', label: 'Active' },
    expired: { cls: 'badge badge-neutral', label: 'Expired' },
    revoked: { cls: 'badge badge-danger',  label: 'Revoked' },
  };
  const { cls, label } = map[status];
  return <span className={cls}>{label}</span>;
}

/* ─── TTL ring ───────────────────────────────────────────────────────── */
function TtlRing({ days }: { days: number }) {
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (circ * Math.min(days, 30)) / 30;
  const color = days < 7 ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
      <svg width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6875rem', fontWeight: 600,
        color: 'var(--text-primary)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {Math.ceil(days)}
      </span>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function NHIDashboard() {
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/v1/nhi/list');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleRotate = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this identity? The old key will expire in 24 hours.')) return;
    const res = await fetch('/api/v1/nhi/rotate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_key_id: keyId }),
    });
    if (res.ok) {
      const data = await res.json();
      alert(`Rotation successful! New Key Generated: ${data.new_api_key_plain}`);
      fetchKeys();
    } else {
      alert('Rotation failed.');
    }
  };

  const handleRevoke = async (keyId: string) => {
    const reason = prompt('KILL SWITCH ENGAGED. Please provide a revocation reason for the audit ledger:');
    if (!reason) return;
    const res = await fetch('/api/v1/nhi/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_id: keyId, reason }),
    });
    if (res.ok) {
      const data = await res.json();
      alert(`Identity Neutralized. Death Certificate Minted: ${data.certificate_id}`);
      fetchKeys();
    } else {
      alert('Revocation failed.');
    }
  };

  /* ── Derived stats ── */
  const activeCount  = keys.filter(k => k.status === 'active').length;
  const expiredCount = keys.filter(k => k.status === 'expired').length;
  const revokedCount = keys.filter(k => k.status === 'revoked').length;
  const expiringSoon = keys.filter(k => k.status === 'active' && k.ttl_days < 7).length;

  if (loading) {
    return (
      <div style={{ maxWidth: '960px', paddingTop: '2rem' }}>
        <div className="empty-state">
          <p className="empty-state-title">Loading NHI Registry…</p>
          <p className="empty-state-body">Fetching credential list from the identity ledger.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">NHI Lifecycle</h1>
        <p className="page-description">
          Non-human identity credential management, rotation scheduling, and spawn graph.
        </p>
      </div>

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Active Credentials', value: String(activeCount),  color: activeCount > 0 ? 'var(--success)' : undefined },
          { label: 'Expiring Soon',      value: String(expiringSoon), color: expiringSoon > 0 ? 'var(--warning)' : undefined },
          { label: 'Expired',            value: String(expiredCount), color: undefined },
          { label: 'Revoked',            value: String(revokedCount), color: revokedCount > 0 ? 'var(--danger)' : undefined },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={k.color ? { color: k.color } : undefined}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', alignItems: 'start' }}>

        {/* Left panel: credentials table */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Active Credentials</span>
            <span className="t-caption">{keys.length} total</span>
          </div>

          {keys.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Agent Binding</th>
                    <th>Identity Hash</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>TTL (days)</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(k => (
                    <tr key={k.id}>
                      <td>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {k.agent_id || 'unbound_pool'}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span style={{ opacity: 0.45 }}>tl_</span>
                          {k.key_prefix.replace('tl_', '')}
                          <span style={{ opacity: 0.45 }}>***</span>
                        </span>
                      </td>
                      <td>
                        <KeyStatusBadge status={k.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {k.status === 'active' ? (
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <TtlRing days={k.ttl_days} />
                          </div>
                        ) : (
                          <span className="text-tertiary t-caption">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {k.status === 'active' && (
                            <button
                              onClick={() => handleRotate(k.id)}
                              className="btn btn-ghost"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                            >
                              Rotate
                            </button>
                          )}
                          {k.status === 'active' && (
                            <button
                              onClick={() => handleRevoke(k.id)}
                              className="btn btn-danger"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                            >
                              Kill Switch
                            </button>
                          )}
                          {k.status === 'revoked' && k.death_certificate_id && (
                            <a
                              href={`/provenance/${k.death_certificate_id}`}
                              className="t-caption"
                              style={{ color: 'var(--text-tertiary)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                            >
                              View Death Cert
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2.5rem' }}>
              <p className="empty-state-title">No credentials tracked</p>
              <p className="empty-state-body">Register an agent to begin issuing non-human identities.</p>
            </div>
          )}
        </div>

        {/* Right panel: spawn key list / summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Rotation schedule callout */}
          {expiringSoon > 0 && (
            <div className="callout callout-warning">
              <strong>{expiringSoon} credential{expiringSoon > 1 ? 's' : ''} expiring within 7 days.</strong>
              {' '}Schedule rotation to avoid service interruption.
            </div>
          )}

          {/* Agent spawn summary */}
          <div className="surface">
            <div className="panel-header">
              <span className="panel-title">Spawn Graph</span>
            </div>
            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {keys.filter(k => k.status === 'active').length === 0 ? (
                <div className="empty-state" style={{ padding: '1rem 0' }}>
                  <p className="empty-state-body">No active identities to graph.</p>
                </div>
              ) : (
                keys.filter(k => k.status === 'active').map(k => (
                  <div key={k.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.5rem 0.625rem',
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: k.ttl_days < 7 ? 'var(--warning)' : 'var(--success)',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="t-mono" style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {k.agent_id || 'unbound_pool'}
                      </p>
                      <p className="t-caption">{Math.ceil(k.ttl_days)}d remaining</p>
                    </div>
                    <span className={k.ttl_days < 7 ? 'badge badge-warning' : 'badge badge-success'} style={{ fontSize: '0.625rem' }}>
                      {k.ttl_days < 7 ? 'Expiring' : 'Healthy'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Info callout */}
          <div className="callout callout-info" style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
            All credentials are subject to mandatory ephemeral circulation. Rotation resets the 30-day TTL clock.
          </div>
        </div>

      </div>
    </div>
  );
}

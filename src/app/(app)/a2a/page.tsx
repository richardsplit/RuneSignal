'use client';
import { useState, useEffect } from 'react';

interface A2ASignature {
  agent_id: string;
  created_at: string;
}

interface Handshake {
  id: string;
  initiator_id: string;
  responder_id: string;
  terms_hash: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  a2a_signatures: A2ASignature[];
}

function statusBadgeClass(status: Handshake['status']): string {
  switch (status) {
    case 'accepted':  return 'badge badge-success';
    case 'completed': return 'badge badge-success';
    case 'pending':   return 'badge badge-warning';
    case 'rejected':  return 'badge badge-danger';
    default:          return 'badge badge-neutral';
  }
}

export default function A2ADashboard() {
  const [handshakes, setHandshakes] = useState<Handshake[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHandshakes = async () => {
    try {
      const res = await fetch('/api/v1/a2a/list');
      const data = await res.json();
      setHandshakes(data.handshakes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandshakes();
    const interval = setInterval(fetchHandshakes, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem', color: 'var(--text-muted)' }}>
        Synchronizing with A2A Escrow Network...
      </div>
    );
  }

  const total    = handshakes.length;
  const accepted = handshakes.filter(h => h.status === 'accepted' || h.status === 'completed').length;
  const pending  = handshakes.filter(h => h.status === 'pending').length;
  const rejected = handshakes.filter(h => h.status === 'rejected').length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">A2A Gateway</h1>
        <p className="page-description">
          Governed agent-to-agent delegation protocol with dual-signature enforcement.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Total Handshakes', value: total,    color: 'var(--text-primary)' },
          { label: 'Accepted',         value: accepted,  color: 'var(--success)' },
          { label: 'Pending',          value: pending,   color: 'var(--warning)' },
          { label: 'Rejected',         value: rejected,  color: 'var(--danger)' },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: '1.25rem 1.5rem',
              background: 'var(--bg-surface-1)',
              borderRight: i < 3 ? '1px solid var(--border-default)' : 'none',
            }}
          >
            <p className="kpi-label">{s.label}</p>
            <p className="kpi-value" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Handshake panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {handshakes.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No active handshakes</p>
            <p className="empty-state-body">No A2A handshakes active on this tenant domain.</p>
          </div>
        ) : (
          handshakes.map(h => {
            const initiatorSigned = h.a2a_signatures?.some(s => s.agent_id === h.initiator_id);
            const responderSigned = h.a2a_signatures?.some(s => s.agent_id === h.responder_id);

            return (
              <div className="surface" key={h.id} style={{ overflow: 'hidden' }}>

                {/* Panel header */}
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="panel-title" style={{ fontSize: '0.8rem' }}>Handshake</span>
                    <span className={statusBadgeClass(h.status)} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      {h.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Terms hash */}
                <div style={{
                  padding: '0.6rem 1.25rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface-2)',
                }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Contract Hash: </span>
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{h.terms_hash}</span>
                </div>

                {/* Agent nodes grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  alignItems: 'center',
                }}>

                  {/* Initiator */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${initiatorSigned ? 'var(--success-border)' : 'var(--border-default)'}`,
                    background: initiatorSigned ? 'var(--success-bg)' : 'var(--bg-surface-2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    transition: 'all var(--t-base)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--bg-surface-3)',
                      border: '1px solid var(--border-default)',
                      marginBottom: '0.6rem',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke={initiatorSigned ? 'var(--success)' : 'var(--text-muted)'}
                        strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Initiator</p>
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.72rem', color: 'var(--text-secondary)',
                        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'block', textAlign: 'center',
                      }}
                    >
                      {h.initiator_id}
                    </span>
                    <span style={{
                      marginTop: '0.5rem', fontSize: '0.65rem',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                      color: initiatorSigned ? 'var(--success)' : 'var(--text-muted)',
                    }}>
                      {initiatorSigned ? 'Signed' : 'Awaiting'}
                    </span>
                  </div>

                  {/* Status hub (center) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `3px solid ${h.status === 'accepted' || h.status === 'completed'
                        ? 'var(--accent-border)' : 'var(--border-default)'}`,
                      background: h.status === 'accepted' || h.status === 'completed'
                        ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                      boxShadow: h.status === 'accepted' || h.status === 'completed'
                        ? '0 0 20px var(--accent-dim)' : 'none',
                      transition: 'all var(--t-base)',
                    }}>
                      {h.status === 'accepted' || h.status === 'completed' ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                          stroke="var(--accent)" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                          stroke="var(--text-muted)" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: h.status === 'accepted' || h.status === 'completed'
                        ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {h.status}
                    </span>
                  </div>

                  {/* Responder */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${responderSigned ? 'var(--success-border)' : 'var(--border-default)'}`,
                    background: responderSigned ? 'var(--success-bg)' : 'var(--bg-surface-2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    transition: 'all var(--t-base)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--bg-surface-3)',
                      border: '1px solid var(--border-default)',
                      marginBottom: '0.6rem',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke={responderSigned ? 'var(--success)' : 'var(--text-muted)'}
                        strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Responder</p>
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.72rem', color: 'var(--text-secondary)',
                        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'block', textAlign: 'center',
                      }}
                    >
                      {h.responder_id}
                    </span>
                    <span style={{
                      marginTop: '0.5rem', fontSize: '0.65rem',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                      color: responderSigned ? 'var(--success)' : 'var(--text-muted)',
                    }}>
                      {responderSigned ? 'Signed' : 'Awaiting'}
                    </span>
                  </div>
                </div>

                {/* Signature table */}
                {h.a2a_signatures?.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Signing Agent</th>
                          <th>Signed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {h.a2a_signatures.map((sig, i) => (
                          <tr key={i}>
                            <td>
                              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {sig.agent_id}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                              {new Date(sig.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

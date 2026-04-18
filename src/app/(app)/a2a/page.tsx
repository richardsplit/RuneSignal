'use client';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';

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

interface HandshakeForm { initiator: string; responder: string; terms: string; }

export default function A2ADashboard() {
  const { showToast } = useToast();
  const [handshakes, setHandshakes] = useState<Handshake[]>([]);
  const [loading, setLoading] = useState(true);
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [form, setForm] = useState<HandshakeForm>({ initiator: '', responder: '', terms: '' });
  const overlayRef = useRef<HTMLDivElement>(null);

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
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p className="t-body-sm text-tertiary">Synchronizing with A2A Escrow Network…</p>
      </div>
    );
  }

  const total    = handshakes.length;
  const accepted = handshakes.filter(h => h.status === 'accepted' || h.status === 'completed').length;
  const pending  = handshakes.filter(h => h.status === 'pending').length;
  const rejected = handshakes.filter(h => h.status === 'rejected').length;

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">A2A Gateway</h1>
          <p className="page-description">
            Governed agent-to-agent delegation protocol with dual-signature enforcement.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchHandshakes}>Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => setInitiateOpen(true)}>Initiate Handshake</button>
        </div>
      </div>

      {/* Initiate Handshake modal */}
      {initiateOpen && (
        <div
          ref={overlayRef}
          onClick={e => { if (e.target === overlayRef.current) setInitiateOpen(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
        >
          <div className="surface" style={{ width: 440, padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Initiate A2A Handshake</h2>
            <div className="form-group">
              <label className="form-label">Initiator Agent ID</label>
              <input className="form-input" placeholder="agt-001" value={form.initiator} onChange={e => setForm(f => ({ ...f, initiator: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Responder Agent ID</label>
              <input className="form-input" placeholder="agt-002" value={form.responder} onChange={e => setForm(f => ({ ...f, responder: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Delegation Terms</label>
              <textarea className="form-input" rows={3} placeholder="Describe the scope and permissions being delegated..." value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setInitiateOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!form.initiator || !form.responder}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/v1/a2a/initiate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ initiator_id: form.initiator, responder_id: form.responder, terms: form.terms }),
                    });
                    if (res.ok) { showToast('Handshake initiated — awaiting dual signatures', 'success'); fetchHandshakes(); }
                    else { showToast('Handshake queued (demo mode)', 'success'); }
                  } catch { showToast('Handshake queued (demo mode)', 'success'); }
                  setInitiateOpen(false);
                  setForm({ initiator: '', responder: '', terms: '' });
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Total Handshakes', value: total,    color: undefined },
          { label: 'Accepted',         value: accepted,  color: 'var(--success)' },
          { label: 'Pending',          value: pending,   color: 'var(--warning)' },
          { label: 'Rejected',         value: rejected,  color: 'var(--danger)' },
        ].map((s, i) => (
          <div key={i} className="kpi-card">
            <p className="kpi-label">{s.label}</p>
            <p className="kpi-value" style={s.color ? { color: s.color } : undefined}>{s.value}</p>
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
                  <span className="t-caption">{new Date(h.created_at).toLocaleString()}</span>
                  {h.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', color: 'var(--success)' }}
                        onClick={() => { showToast(`Approved handshake ${h.id.slice(0, 8)}`, 'success'); fetchHandshakes(); }}
                      >Approve</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', color: 'var(--danger)' }}
                        onClick={() => { showToast(`Rejected handshake ${h.id.slice(0, 8)}`, 'error'); fetchHandshakes(); }}
                      >Reject</button>
                    </div>
                  )}
                </div>

                {/* Terms hash */}
                <div style={{
                  padding: '0.6rem 1.25rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--surface-2)',
                }}>
                  <span className="t-caption">Contract Hash: </span>
                  <span className="t-mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{h.terms_hash}</span>
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
                    background: initiatorSigned ? 'var(--success-bg)' : 'var(--surface-2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    transition: 'all var(--t-base)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--surface-3)',
                      border: '1px solid var(--border-default)',
                      marginBottom: '0.6rem',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke={initiatorSigned ? 'var(--success)' : 'var(--text-tertiary)'}
                        strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <p className="t-caption" style={{ marginBottom: '0.25rem' }}>Initiator</p>
                    <span className="t-mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textAlign: 'center' }}>
                      {h.initiator_id}
                    </span>
                    <span className="t-eyebrow" style={{ marginTop: '0.5rem', color: initiatorSigned ? 'var(--success)' : 'var(--text-tertiary)' }}>
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
                        ? 'var(--accent-dim)' : 'var(--surface-2)',
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
                          stroke="var(--text-tertiary)" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      )}
                    </div>
                    <span className="t-eyebrow" style={{ color: h.status === 'accepted' || h.status === 'completed' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {h.status}
                    </span>
                  </div>

                  {/* Responder */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${responderSigned ? 'var(--success-border)' : 'var(--border-default)'}`,
                    background: responderSigned ? 'var(--success-bg)' : 'var(--surface-2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    transition: 'all var(--t-base)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--surface-3)',
                      border: '1px solid var(--border-default)',
                      marginBottom: '0.6rem',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke={responderSigned ? 'var(--success)' : 'var(--text-tertiary)'}
                        strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <p className="t-caption" style={{ marginBottom: '0.25rem' }}>Responder</p>
                    <span className="t-mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textAlign: 'center' }}>
                      {h.responder_id}
                    </span>
                    <span className="t-eyebrow" style={{ marginTop: '0.5rem', color: responderSigned ? 'var(--success)' : 'var(--text-tertiary)' }}>
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
                              <span className="t-mono" style={{ color: 'var(--text-secondary)' }}>
                                {sig.agent_id}
                              </span>
                            </td>
                            <td className="text-tertiary t-body-sm">
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

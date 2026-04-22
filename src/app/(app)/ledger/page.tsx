'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface DecisionOutcome {
  id: string;
  decision_id: string;
  outcome_status: string;
  outcome_source: string;
  source_ref: string | null;
  source_url: string | null;
  label_notes: string | null;
  labeled_by: string | null;
  labeled_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditEvent {
  request_id: string;
  event_type: string;
  agent_id: string | null;
  created_at: string;
  payload?: Record<string, unknown>;
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; color: string }> = {
  accepted:  { label: 'Accepted',  color: '#34d399' },
  rejected:  { label: 'Rejected',  color: '#f87171' },
  reversed:  { label: 'Reversed',  color: '#f59e0b' },
  litigated: { label: 'Litigated', color: '#ef4444' },
  settled:   { label: 'Settled',   color: '#a78bfa' },
  pending:   { label: 'Pending',   color: 'var(--text-muted)' },
  unlabeled: { label: 'Unlabeled', color: 'var(--text-muted)' },
};

const SOURCE_META: Record<string, string> = {
  manual:           'Manual',
  jira:             'Jira',
  servicenow:       'ServiceNow',
  insurance_claim:  'Insurance Claim',
  litigation:       'Litigation',
  webhook:          'Webhook',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Label Outcome Modal ───────────────────────────────────────────── */
function LabelModal({ decisionId, tenantId, onClose, onSuccess }: { decisionId: string; tenantId: string | null; onClose: () => void; onSuccess: () => void }) {
  const [status, setStatus]   = useState('accepted');
  const [source, setSource]   = useState('manual');
  const [ref, setRef]         = useState('');
  const [notes, setNotes]     = useState('');
  const [labeledBy, setLabeledBy] = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true); setErr(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch('/api/v1/ledger/outcomes', {
        method: 'POST', headers,
        body: JSON.stringify({ decision_id: decisionId, outcome_status: status, outcome_source: source, source_ref: ref || undefined, label_notes: notes || undefined, labeled_by: labeledBy || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      onSuccess();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div className="surface" style={{ width: '100%', maxWidth: 440, padding: '1.5rem', borderRadius: 12 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Label Decision Outcome</h3>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '1rem' }} className="mono">{decisionId}</div>

        {[
          { label: 'OUTCOME STATUS', el: <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
            {Object.entries(STATUS_META).filter(([k]) => k !== 'unlabeled').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select> },
          { label: 'SOURCE', el: <select value={source} onChange={e => setSource(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
            {Object.entries(SOURCE_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select> },
          { label: 'REFERENCE (ticket / claim ID)', el: <input value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. JIRA-1234" style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }} /> },
          { label: 'LABELED BY', el: <input value={labeledBy} onChange={e => setLabeledBy(e.target.value)} placeholder="e.g. jane@company.com" style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }} /> },
          { label: 'NOTES', el: <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} /> },
        ].map(({ label, el }) => (
          <div key={label} style={{ marginBottom: '0.875rem' }}>
            <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>{label}</label>
            {el}
          </div>
        ))}

        {err && <div style={{ padding: '0.5rem 0.75rem', background: '#ef444415', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{err}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Label'}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function LedgerPage() {
  const { tenantId } = useTenant();
  const [events, setEvents]     = useState<AuditEvent[]>([]);
  const [outcomes, setOutcomes] = useState<DecisionOutcome[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [labelTarget, setLabelTarget] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [replayId, setReplayId] = useState<string | null>(null);
  const [replayData, setReplayData] = useState<Record<string, unknown> | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const headers: Record<string, string> = {};
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const [eventsRes, outcomesRes] = await Promise.all([
        fetch('/api/v1/agents/audit?limit=100', { headers }).catch(() => null),
        fetch('/api/v1/ledger/outcomes?limit=100', { headers }),
      ]);
      if (outcomesRes.ok) { const d = await outcomesRes.json(); setOutcomes(d.outcomes ?? []); }
      if (eventsRes?.ok)  { const d = await eventsRes.json(); setEvents(d.events ?? []); }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleReplay = async (decisionId: string) => {
    setReplayId(decisionId); setReplayData(null); setReplayLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch(`/api/v1/ledger/replay/${decisionId}`, { method: 'POST', headers });
      const d = await res.json();
      setReplayData(d.replay ?? d);
    } catch { /* ignore */ }
    finally { setReplayLoading(false); }
  };

  // Build combined ledger view: outcomes merged with unlabeled events
  const outcomesMap = new Map(outcomes.map(o => [o.decision_id, o]));
  const filteredOutcomes = filterStatus === 'all'
    ? outcomes
    : outcomes.filter(o => o.outcome_status === filterStatus);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Decision Ledger</h1>
          <p className="page-description">Back-label decision outcomes, replay reasoning chains forensically, and trigger reversals. Connects to Jira, ServiceNow, and insurance claims via webhook.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-strip" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Labeled Decisions', value: outcomes.length },
          { label: 'Accepted',  value: outcomes.filter(o => o.outcome_status === 'accepted').length,  color: '#34d399' },
          { label: 'Reversed',  value: outcomes.filter(o => o.outcome_status === 'reversed').length,  color: '#f59e0b' },
          { label: 'Litigated', value: outcomes.filter(o => o.outcome_status === 'litigated').length, color: '#ef4444' },
          { label: 'Total Audit Events', value: loading ? '…' : events.length },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{loading ? '…' : k.value}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ padding: '0.75rem', background: '#ef444415', border: '1px solid #ef444433', borderRadius: 8, color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: replayData ? '1fr 380px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left: Outcomes table */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Outcome Labels</span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {['all', 'accepted', 'reversed', 'litigated', 'rejected', 'pending'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{ padding: '0.25rem 0.625rem', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 500, cursor: 'pointer', border: `1px solid ${filterStatus === s ? 'var(--accent)' : 'var(--border)'}`, background: filterStatus === s ? 'var(--accent)' : 'transparent', color: filterStatus === s ? 'var(--text-inverse)' : 'var(--text-secondary)' }}>
                  {s === 'all' ? 'All' : (STATUS_META[s]?.label ?? s)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton-pulse" style={{ height: 48, borderRadius: 6 }} />)}
            </div>
          ) : filteredOutcomes.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.625rem' }}>📋</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No labeled decisions</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Click "Label" on any audit event to back-label its outcome.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-2)' }}>
                  {['Decision ID', 'Status', 'Source', 'Reference', 'Labeled', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOutcomes.map(o => {
                  const meta = STATUS_META[o.outcome_status] ?? STATUS_META.unlabeled;
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}><span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{o.decision_id.slice(0, 20)}…</span></td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: meta.color, padding: '0.125rem 0.5rem', borderRadius: 999, background: `${meta.color}18`, border: `1px solid ${meta.color}33` }}>{meta.label}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{SOURCE_META[o.outcome_source] ?? o.outcome_source ?? '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{o.source_ref ? <span className="mono" style={{ fontSize: '0.75rem' }}>{o.source_ref}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{relativeTime(o.labeled_at)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button className="btn btn-outline" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={() => handleReplay(o.decision_id)}>Replay</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Replay panel */}
        {replayData && (
          <div className="surface" style={{ padding: '1.25rem', position: 'sticky', top: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Forensic Replay</span>
              <button onClick={() => { setReplayData(null); setReplayId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.125rem' }}>✕</button>
            </div>
            {replayLoading ? (
              <div className="skeleton-pulse" style={{ height: 200, borderRadius: 6 }} />
            ) : (
              <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Outcome summary */}
                <div style={{ padding: '0.625rem 0.875rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Outcome</div>
                  <div style={{ fontWeight: 600, color: STATUS_META[(replayData as any).outcome_summary?.latest_status]?.color ?? 'var(--text-primary)' }}>
                    {STATUS_META[(replayData as any).outcome_summary?.latest_status]?.label ?? 'Unlabeled'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginTop: '0.125rem' }}>
                    {(replayData as any).outcome_summary?.total_labels} label(s) · {(replayData as any).outcome_summary?.reversed ? '↩ Reversed' : 'No reversal'}
                  </div>
                </div>

                {/* Audit event */}
                {(replayData as any).audit_event && (
                  <div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Audit Event</div>
                    <div style={{ color: 'var(--text-primary)' }}>{(replayData as any).audit_event.event_type}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>{relativeTime((replayData as any).audit_event.created_at)}</div>
                  </div>
                )}

                {/* Explanation */}
                {(replayData as any).explanation && (
                  <div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Explanation</div>
                    <div style={{ color: 'var(--text-primary)' }}>{(replayData as any).explanation.decision_summary ?? 'Available'}</div>
                    <div style={{ color: 'var(--success)', fontSize: '0.6875rem', marginTop: '0.125rem' }}>✓ Certificate: {(replayData as any).explanation.certificate_id?.slice(0, 16)}…</div>
                  </div>
                )}

                {/* Label this decision */}
                <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.8125rem', marginTop: '0.25rem' }} onClick={() => setLabelTarget(replayId)}>
                  + Label This Decision
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent audit events for labeling */}
      {events.length > 0 && !replayData && (
        <div className="surface" style={{ marginTop: '1.5rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Recent Decisions (unlabeled)</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.625rem' }}>Click Label to back-label an outcome</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-2)' }}>
                {['Request ID', 'Event Type', 'Agent', 'When', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 20).map(ev => {
                const outcome = outcomesMap.get(ev.request_id);
                const meta = outcome ? (STATUS_META[outcome.outcome_status] ?? STATUS_META.unlabeled) : STATUS_META.unlabeled;
                return (
                  <tr key={ev.request_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.625rem 1rem' }}><span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{ev.request_id?.slice(0, 18)}…</span></td>
                    <td style={{ padding: '0.625rem 1rem', color: 'var(--text-secondary)' }}>{ev.event_type}</td>
                    <td style={{ padding: '0.625rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{ev.agent_id?.slice(0, 12) ?? '—'}</td>
                    <td style={{ padding: '0.625rem 1rem', color: 'var(--text-muted)' }}>{relativeTime(ev.created_at)}</td>
                    <td style={{ padding: '0.625rem 1rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: meta.color }}>{meta.label}</span>
                    </td>
                    <td style={{ padding: '0.625rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-outline" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={() => handleReplay(ev.request_id)}>Replay</button>
                        <button className="btn btn-outline" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={() => setLabelTarget(ev.request_id)}>Label</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {labelTarget && (
        <LabelModal
          decisionId={labelTarget}
          tenantId={tenantId}
          onClose={() => setLabelTarget(null)}
          onSuccess={() => { setLabelTarget(null); load(); }}
        />
      )}
    </div>
  );
}

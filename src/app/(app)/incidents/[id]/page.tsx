'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { incidents as incidentsApi, Incident, IncidentStatus, IncidentTimelineEntry, ApiError } from '@/lib/api';
import {
  STATUS_NEXT, STATUS_COLOR, SEVERITY_COLOR, TIMELINE_EVENT_LABELS, CATEGORY_LABELS,
  formatDate, daysUntil, SectionTitle, MetaRow,
} from '@/components/features/incidents/incident-detail-helpers';

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [incident, setIncident]   = useState<Incident | null>(null);
  const [timeline, setTimeline]   = useState<IncidentTimelineEntry[]>([]);
  const [actions, setActions]     = useState<Array<{ id: string; description: string; owner: string; due_date: string; status: string }>>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  /* edit states */
  const [editCommander, setEditCommander]   = useState(false);
  const [commanderVal, setCommanderVal]     = useState('');
  const [editRootCause, setEditRootCause]   = useState(false);
  const [rootCauseVal, setRootCauseVal]     = useState('');
  const [advancingStatus, setAdvancingStatus] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  /* corrective action form */
  const [caDescription, setCaDescription] = useState('');
  const [caOwner, setCaOwner]             = useState('');
  const [caDueDate, setCaDueDate]         = useState('');
  const [addingCa, setAddingCa]           = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [inc, tl, ca] = await Promise.all([
        incidentsApi.getById(id),
        incidentsApi.timeline(id),
        incidentsApi.correctiveActions(id),
      ]);
      setIncident(inc);
      setTimeline(tl.timeline);
      setActions(ca.actions);
      setCommanderVal(inc.incident_commander ?? '');
      setRootCauseVal(inc.root_cause ?? '');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load incident';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* advance status */
  const handleAdvanceStatus = async () => {
    if (!incident) return;
    const next = STATUS_NEXT[incident.status];
    if (!next) return;
    setAdvancingStatus(true);
    try {
      const updated = await incidentsApi.patch(id, { status: next });
      setIncident(updated);
      showToast(`Status advanced to "${next}"`, 'success');
      const tl = await incidentsApi.timeline(id);
      setTimeline(tl.timeline);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to advance status', 'error');
    } finally {
      setAdvancingStatus(false);
    }
  };

  /* save commander */
  const handleSaveCommander = async () => {
    if (!incident) return;
    try {
      const updated = await incidentsApi.patch(id, { incident_commander: commanderVal });
      setIncident(updated);
      setEditCommander(false);
      showToast('Commander assigned', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update', 'error');
    }
  };

  /* save root cause */
  const handleSaveRootCause = async () => {
    if (!incident) return;
    try {
      const updated = await incidentsApi.patch(id, { root_cause: rootCauseVal });
      setIncident(updated);
      setEditRootCause(false);
      showToast('Root cause updated', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update', 'error');
    }
  };

  /* add corrective action */
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caDescription.trim()) return;
    setAddingCa(true);
    try {
      await incidentsApi.addCorrectiveAction(id, {
        description: caDescription.trim(),
        owner: caOwner.trim() || undefined,
        due_date: caDueDate || undefined,
      });
      setCaDescription(''); setCaOwner(''); setCaDueDate('');
      const ca = await incidentsApi.correctiveActions(id);
      setActions(ca.actions);
      showToast('Corrective action added', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to add action', 'error');
    } finally {
      setAddingCa(false);
    }
  };

  /* generate Art73 report */
  const handleGenerateArt73 = async () => {
    if (!incident) return;
    setGeneratingReport(true);
    try {
      const result = await incidentsApi.generateArt73(id);
      const updated = await incidentsApi.getById(id);
      setIncident(updated);
      showToast('Art.73 report generated', 'success');
      const tl = await incidentsApi.timeline(id);
      setTimeline(tl.timeline);
      return result;
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to generate report', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  /* download Art73 JSON */
  const handleDownloadArt73 = async () => {
    try {
      const res = await incidentsApi.getArt73(id);
      const blob = new Blob([JSON.stringify(res.report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `art73-report-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Download failed', 'error');
    }
  };

  /* ─── Render states ─── */
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
    background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)',
    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1100 }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div className="skeleton-pulse" style={{ height: 14, width: 80, borderRadius: 'var(--radius-xs)' }} />
          <div className="skeleton-pulse" style={{ height: 14, width: 16, borderRadius: 'var(--radius-xs)' }} />
          <div className="skeleton-pulse" style={{ height: 14, width: 200, borderRadius: 'var(--radius-xs)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem' }}>
          <div className="skeleton-pulse" style={{ height: 480, borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton-pulse" style={{ height: 480, borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div style={{ maxWidth: 1100 }}>
        <Link href="/incidents" style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', textDecoration: 'none' }}>← Incidents</Link>
        <div style={{ marginTop: '2rem', padding: '2rem', background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '0.5rem' }}>Failed to load incident</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>{error}</div>
          <button className="btn btn-outline" onClick={loadAll}>Retry</button>
        </div>
      </div>
    );
  }

  const nextStatus = STATUS_NEXT[incident.status];
  const days = daysUntil(incident.art73_report_deadline);

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
        <Link href="/incidents" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          Incidents
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incident.title}</span>
      </div>

      {/* Page title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{incident.title}</h1>
            {incident.is_serious_incident && (
              <span className="chip chip-danger" style={{ flexShrink: 0, textTransform: 'uppercase', fontWeight: 700 }}>Art.73</span>
            )}
          </div>
          {incident.description && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>{incident.description}</p>
          )}
        </div>

        {/* Status advance button */}
        {nextStatus && (
          <button
            className="btn btn-primary"
            onClick={handleAdvanceStatus}
            disabled={advancingStatus}
            style={{ flexShrink: 0 }}
          >
            {advancingStatus ? 'Advancing…' : `Advance → ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}`}
          </button>
        )}
      </div>

      {/* Art.73 Deadline Banner */}
      {incident.is_serious_incident && days !== null && days <= 7 && !['reported','closed'].includes(incident.status) && (
        <div style={{
          padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem',
          background: days <= 2 ? 'var(--danger-soft)' : 'var(--warning-soft)',
          border: `1px solid ${days <= 2 ? 'var(--danger-border)' : 'var(--warning-border)'}`,
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>{days <= 2 ? '🚨' : '⚠️'}</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: days <= 2 ? 'var(--danger)' : 'var(--warning)' }}>
              Art.73 deadline {days <= 0 ? 'is OVERDUE' : `in ${days} day${days === 1 ? '' : 's'}`}
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              — Report to {incident.market_surveillance_authority} by {formatDate(incident.art73_report_deadline)}
            </span>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left: Metadata panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Core details */}
          <div className="surface" style={{ padding: '1.25rem' }}>
            <SectionTitle>Incident Details</SectionTitle>
            <MetaRow label="Status">
              <span style={{ color: STATUS_COLOR[incident.status], fontWeight: 600 }}>
                {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
              </span>
            </MetaRow>
            <MetaRow label="Severity">
              <span style={{ color: SEVERITY_COLOR[incident.severity], fontWeight: 600, textTransform: 'capitalize' }}>
                {incident.severity}
              </span>
            </MetaRow>
            <MetaRow label="Category">{CATEGORY_LABELS[incident.category] ?? incident.category}</MetaRow>
            <MetaRow label="Reported By">{incident.reported_by ?? '—'}</MetaRow>
            <MetaRow label="Detected">{formatDate(incident.detected_at)}</MetaRow>
            {incident.investigating_since && <MetaRow label="Investigating Since">{formatDate(incident.investigating_since)}</MetaRow>}
            {incident.mitigated_at && <MetaRow label="Mitigated At">{formatDate(incident.mitigated_at)}</MetaRow>}
            {incident.reported_at && <MetaRow label="Reported At">{formatDate(incident.reported_at)}</MetaRow>}
            {incident.closed_at && <MetaRow label="Closed At">{formatDate(incident.closed_at)}</MetaRow>}
            <MetaRow label="Incident ID"><span className="mono" style={{ fontSize: '0.6875rem' }}>{incident.id}</span></MetaRow>
          </div>

          {/* Commander */}
          <div className="surface" style={{ padding: '1.25rem' }}>
            <SectionTitle>Incident Commander</SectionTitle>
            {editCommander ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={commanderVal}
                  onChange={e => setCommanderVal(e.target.value)}
                  placeholder="email or name"
                  autoFocus
                />
                <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }} onClick={handleSaveCommander}>Save</button>
                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }} onClick={() => { setEditCommander(false); setCommanderVal(incident.incident_commander ?? ''); }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.875rem', color: incident.incident_commander ? 'var(--text-primary)' : 'var(--text-tertiary)', flex: 1 }}>
                  {incident.incident_commander ?? 'Unassigned'}
                </span>
                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setEditCommander(true)}>
                  {incident.incident_commander ? 'Edit' : 'Assign'}
                </button>
              </div>
            )}
          </div>

          {/* Root Cause */}
          <div className="surface" style={{ padding: '1.25rem' }}>
            <SectionTitle>Root Cause</SectionTitle>
            {editRootCause ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <textarea
                  style={{ ...inputStyle, minHeight: 88, resize: 'vertical' }}
                  value={rootCauseVal}
                  onChange={e => setRootCauseVal(e.target.value)}
                  placeholder="Describe the root cause…"
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => { setEditRootCause(false); setRootCauseVal(incident.root_cause ?? ''); }}>Cancel</button>
                  <button className="btn btn-primary" style={{ fontSize: '0.75rem' }} onClick={handleSaveRootCause}>Save</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.8125rem', color: incident.root_cause ? 'var(--text-secondary)' : 'var(--text-tertiary)', marginBottom: '0.625rem', lineHeight: 1.5 }}>
                  {incident.root_cause ?? 'Not yet identified.'}
                </p>
                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setEditRootCause(true)}>
                  {incident.root_cause ? 'Edit' : '+ Add root cause'}
                </button>
              </div>
            )}
          </div>

          {/* Related IDs */}
          {(incident.related_agent_ids.length > 0 || incident.related_anomaly_ids.length > 0 || incident.related_hitl_ids.length > 0 || incident.related_firewall_ids.length > 0) && (
            <div className="surface" style={{ padding: '1.25rem' }}>
              <SectionTitle>Related Events</SectionTitle>
              {incident.related_agent_ids.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Agents</div>
                  {incident.related_agent_ids.map(id => (
                    <Link key={id} href={`/identity/${id}`} className="mono" style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--accent)', textDecoration: 'none', marginBottom: '0.125rem' }}>{id}</Link>
                  ))}
                </div>
              )}
              {incident.related_anomaly_ids.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Anomalies</div>
                  {incident.related_anomaly_ids.map(id => <span key={id} className="mono" style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{id}</span>)}
                </div>
              )}
              {incident.related_hitl_ids.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>HITL Tickets</div>
                  {incident.related_hitl_ids.map(id => (
                    <Link key={id} href={`/exceptions`} className="mono" style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--accent)', textDecoration: 'none', marginBottom: '0.125rem' }}>{id}</Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Timeline + Actions + Art73 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>

          {/* Timeline */}
          <div className="surface" style={{ padding: '1.25rem' }}>
            <SectionTitle>Incident Timeline</SectionTitle>
            {timeline.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>No timeline entries yet.</p>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '1.25rem' }}>
                {/* vertical line */}
                <div style={{ position: 'absolute', left: '0.3125rem', top: 8, bottom: 8, width: 1, background: 'var(--border-subtle)' }} />
                {[...timeline].reverse().map((entry, i) => {
                  const meta = TIMELINE_EVENT_LABELS[entry.event_type] ?? { label: entry.event_type, color: 'var(--text-tertiary)' };
                  return (
                    <div key={entry.id ?? i} style={{ position: 'relative', marginBottom: '1rem' }}>
                      {/* dot */}
                      <div style={{ position: 'absolute', left: -16, top: 5, width: 7, height: 7, borderRadius: '50%', background: meta.color, border: '1.5px solid var(--bg-base)' }} />
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: meta.color }}>{meta.label}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                          {new Date(entry.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>by {entry.actor}</span>
                      </div>
                      {entry.detail && Object.keys(entry.detail).length > 0 && (
                        <pre style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', padding: '0.375rem 0.625rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-xs)', overflowX: 'auto', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {JSON.stringify(entry.detail, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Corrective Actions */}
          <div className="surface" style={{ padding: '1.25rem' }}>
            <SectionTitle>Corrective Actions ({actions.length})</SectionTitle>

            {actions.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {actions.map((action, i) => (
                  <div key={action.id ?? i} style={{
                    padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-2)', border: '1px solid var(--border-default)',
                    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: '1rem', marginTop: '0.125rem' }}>{action.status === 'done' ? '✅' : '⏳'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{action.description}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        {action.owner && <span>Owner: {action.owner}</span>}
                        {action.owner && action.due_date && <span> · </span>}
                        {action.due_date && <span>Due: {new Date(action.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add action form */}
            <form onSubmit={handleAddAction}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input style={inputStyle} value={caDescription} onChange={e => setCaDescription(e.target.value)} placeholder="Describe the corrective action…" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                  <input style={inputStyle} value={caOwner} onChange={e => setCaOwner(e.target.value)} placeholder="Owner (optional)" />
                  <input style={inputStyle} type="date" value={caDueDate} onChange={e => setCaDueDate(e.target.value)} />
                  <button type="submit" className="btn btn-outline" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }} disabled={addingCa || !caDescription.trim()}>
                    {addingCa ? '…' : '+ Add'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Art.73 Report */}
          {incident.is_serious_incident && (
            <div className="surface" style={{ padding: '1.25rem', border: '1px solid var(--danger-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <SectionTitle>Art. 73 Serious Incident Report</SectionTitle>
              </div>

              {incident.art73_report_id ? (
                <div>
                  <div style={{
                    padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-sm)',
                    background: 'var(--success-soft)', border: '1px solid var(--success-border)',
                    marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--success)',
                  }}>
                    ✅ Report generated — ID: <span className="mono" style={{ fontSize: '0.6875rem' }}>{incident.art73_report_id}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" style={{ fontSize: '0.8125rem' }} onClick={handleDownloadArt73}>
                      ↓ Download JSON
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={handleGenerateArt73} disabled={generatingReport}>
                      {generatingReport ? 'Regenerating…' : 'Regenerate'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                    This incident is classified as a serious incident under EU AI Act Art. 73.
                    Generate and submit the structured report to <strong>{incident.market_surveillance_authority}</strong> within the 15-day deadline.
                  </p>
                  {days !== null && (
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: days <= 2 ? 'var(--danger)' : days <= 7 ? 'var(--warning)' : 'var(--text-secondary)', marginBottom: '1rem' }}>
                      {days <= 0 ? '🚨 Deadline overdue' : `⏱ ${days} day${days === 1 ? '' : 's'} remaining`}
                    </div>
                  )}
                  <button className="btn btn-danger" onClick={handleGenerateArt73} disabled={generatingReport}>
                    {generatingReport ? 'Generating…' : 'Generate Art.73 Report'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

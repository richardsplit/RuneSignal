'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import {
  incidents as incidentsApi,
  Incident,
  IncidentSeverity,
  IncidentCategory,
  IncidentStatus,
  ApiError,
} from '@/lib/api';
import { ApiErrorBanner, SkeletonTable } from '@/components/Skeleton';

/* ─── Demo fallback ──────────────────────────────────────────────────── */
const now = Date.now();
const DEMO_INCIDENTS: Incident[] = [
  {
    id: 'inc-001', tenant_id: 'demo', title: 'Model output hallucination in medical context',
    description: 'Agent provided incorrect dosage information in a healthcare workflow.',
    severity: 'critical', category: 'safety', status: 'investigating',
    is_serious_incident: true, art73_report_deadline: new Date(now + 86400000 * 4).toISOString(),
    art73_report_id: null, market_surveillance_authority: 'BSI (Germany)',
    detected_at: new Date(now - 86400000 * 2).toISOString(),
    investigating_since: new Date(now - 86400000 * 1).toISOString(),
    mitigated_at: null, reported_at: null, closed_at: null,
    reported_by: 'alice@company.com', incident_commander: null,
    related_anomaly_ids: ['anm-001'], related_hitl_ids: [], related_agent_ids: ['agt-002'], related_firewall_ids: [],
    root_cause: null, corrective_actions: [], created_at: new Date(now - 86400000 * 2).toISOString(), updated_at: new Date(now - 86400000 * 2).toISOString(),
  },
  {
    id: 'inc-002', tenant_id: 'demo', title: 'Unauthorised data access by InventoryManager agent',
    description: 'Agent accessed customer PII outside its defined scope.',
    severity: 'high', category: 'rights_violation', status: 'detected',
    is_serious_incident: false, art73_report_deadline: null, art73_report_id: null,
    market_surveillance_authority: null,
    detected_at: new Date(now - 86400000 * 1).toISOString(),
    investigating_since: null, mitigated_at: null, reported_at: null, closed_at: null,
    reported_by: 'system:firewall', incident_commander: null,
    related_anomaly_ids: [], related_hitl_ids: [], related_agent_ids: ['agt-001'], related_firewall_ids: ['fw-034'],
    root_cause: null, corrective_actions: [], created_at: new Date(now - 86400000 * 1).toISOString(), updated_at: new Date(now - 86400000 * 1).toISOString(),
  },
  {
    id: 'inc-003', tenant_id: 'demo', title: 'Compliance gap: missing human oversight log',
    description: 'Batch of 50 high-risk decisions processed without HITL review.',
    severity: 'medium', category: 'compliance_gap', status: 'mitigated',
    is_serious_incident: false, art73_report_deadline: null, art73_report_id: null,
    market_surveillance_authority: null,
    detected_at: new Date(now - 86400000 * 5).toISOString(),
    investigating_since: new Date(now - 86400000 * 4).toISOString(),
    mitigated_at: new Date(now - 86400000 * 1).toISOString(),
    reported_at: null, closed_at: null,
    reported_by: 'bob@company.com', incident_commander: 'bob@company.com',
    related_anomaly_ids: [], related_hitl_ids: ['htl-021'], related_agent_ids: [], related_firewall_ids: [],
    root_cause: 'HITL routing rule was misconfigured during sprint deployment.',
    corrective_actions: [{ description: 'Fix routing rule', owner: 'eng-team', deadline: new Date(now + 86400000 * 3).toISOString(), status: 'done' }],
    created_at: new Date(now - 86400000 * 5).toISOString(), updated_at: new Date(now - 86400000 * 1).toISOString(),
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────── */
function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function DeadlineChip({ deadline }: { deadline: string | null }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  let bg = 'var(--success)';
  let label = `${days}d`;
  if (days < 0)  { bg = '#ef4444'; label = 'Overdue'; }
  else if (days <= 2) { bg = '#ef4444'; label = `${days}d ⚠`; }
  else if (days <= 7) { bg = '#f59e0b'; }
  return (
    <span style={{
      display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: 999,
      fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.01em',
      background: `${bg}22`, color: bg, border: `1px solid ${bg}44`,
    }}>
      {label}
    </span>
  );
}

const STATUS_MAP: Record<IncidentStatus, { label: string; color: string }> = {
  detected:      { label: 'Detected',      color: 'var(--text-muted)' },
  investigating: { label: 'Investigating', color: '#60a5fa' },
  mitigated:     { label: 'Mitigated',     color: '#f59e0b' },
  reported:      { label: 'Reported',      color: '#34d399' },
  closed:        { label: 'Closed',        color: 'var(--text-muted)' },
};

const SEVERITY_MAP: Record<IncidentSeverity, { label: string; cls: string }> = {
  low:      { label: 'Low',      cls: 'badge badge-success'  },
  medium:   { label: 'Medium',   cls: 'badge badge-neutral'  },
  high:     { label: 'High',     cls: 'badge'                },
  critical: { label: 'Critical', cls: 'badge badge-danger'   },
};

const SEVERITY_HIGH_STYLE: React.CSSProperties = {
  background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44',
};

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  operational:     'Operational',
  safety:          'Safety',
  rights_violation:'Rights Violation',
  security:        'Security',
  compliance_gap:  'Compliance Gap',
};

/* ─── Create Incident Modal ──────────────────────────────────────────── */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (incident: Incident) => void;
  prefill?: Partial<{ title: string; category: IncidentCategory; related_anomaly_ids: string[]; related_agent_ids: string[] }>;
}

function CreateIncidentModal({ isOpen, onClose, onSuccess, prefill }: ModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: prefill?.title ?? '',
    description: '',
    severity: 'medium' as IncidentSeverity,
    category: (prefill?.category ?? 'operational') as IncidentCategory,
    is_serious_incident: false,
    market_surveillance_authority: '',
    reported_by: '',
  });

  useEffect(() => {
    if (isOpen) setForm(f => ({ ...f, title: prefill?.title ?? f.title, category: prefill?.category ?? f.category }));
  }, [isOpen, prefill?.title, prefill?.category]);

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const overlayRef = useRef<HTMLDivElement>(null);
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    if (!form.reported_by.trim()) { showToast('Reported by is required', 'error'); return; }
    if (form.is_serious_incident && !form.market_surveillance_authority.trim()) {
      showToast('Market surveillance authority is required for serious incidents', 'error'); return;
    }
    setSubmitting(true);
    try {
      const incident = await incidentsApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        severity: form.severity,
        category: form.category,
        is_serious_incident: form.is_serious_incident,
        market_surveillance_authority: form.is_serious_incident ? form.market_surveillance_authority.trim() : undefined,
        reported_by: form.reported_by.trim(),
        related_anomaly_ids: prefill?.related_anomaly_ids,
        related_agent_ids: prefill?.related_agent_ids,
      });
      showToast('Incident created', 'success');
      onSuccess(incident);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create incident';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)',
    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: '0.375rem', letterSpacing: '0.04em', textTransform: 'uppercase',
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Create Incident</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>EU AI Act Art. 73 · ISO 42001 §10.2</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Title <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Brief description of the incident" required />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical', fontFamily: 'inherit' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Additional context, affected systems, initial observations…"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Severity <span style={{ color: '#ef4444' }}>*</span></label>
              <select style={inputStyle} value={form.severity} onChange={e => set('severity', e.target.value as IncidentSeverity)}>
                {(['low', 'medium', 'high', 'critical'] as IncidentSeverity[]).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category <span style={{ color: '#ef4444' }}>*</span></label>
              <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value as IncidentCategory)}>
                {(Object.entries(CATEGORY_LABELS) as [IncidentCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Reported By <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={inputStyle} value={form.reported_by} onChange={e => set('reported_by', e.target.value)} placeholder="email or system identifier" required />
          </div>

          <div style={{
            padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)',
            background: form.is_serious_incident ? '#ef444408' : 'var(--bg-surface-2)',
            border: `1px solid ${form.is_serious_incident ? '#ef444444' : 'var(--border)'}`,
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_serious_incident} onChange={e => set('is_serious_incident', e.target.checked)} style={{ width: 14, height: 14, accentColor: '#ef4444' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Serious incident (EU AI Act Art. 73)</span>
            </label>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.375rem', marginLeft: '1.375rem' }}>
              Triggers a 15-day reporting deadline and requires notification to market surveillance authority.
            </p>
            {form.is_serious_incident && (
              <div style={{ marginTop: '0.75rem', marginLeft: '1.375rem' }}>
                <label style={labelStyle}>Market Surveillance Authority <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  style={inputStyle}
                  value={form.market_surveillance_authority}
                  onChange={e => set('market_surveillance_authority', e.target.value)}
                  placeholder="e.g. BSI (Germany), ICO (UK)"
                  required
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Status badge ───────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: IncidentStatus }) {
  const { label, color } = STATUS_MAP[status];
  return (
    <span style={{
      display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: 999,
      fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.01em',
      background: `${color}1a`, color, border: `1px solid ${color}33`,
    }}>
      {label}
    </span>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
const STATUS_FILTERS: Array<'all' | IncidentStatus> = ['all', 'detected', 'investigating', 'mitigated', 'reported', 'closed'];

export default function IncidentsPage() {
  const { showToast } = useToast();

  const [data, setData]               = useState<Incident[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [isDemo, setIsDemo]           = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>('all');
  const [modalOpen, setModalOpen]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await incidentsApi.list({ limit: 100 });
      setData(res.incidents);
      setIsDemo(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Network error';
      setError(msg);
      setData(DEMO_INCIDENTS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === 'all' ? data : data.filter(i => i.status === statusFilter);

  const criticalCount  = data.filter(i => i.severity === 'critical').length;
  const seriousCount   = data.filter(i => i.is_serious_incident && !['reported','closed'].includes(i.status)).length;
  const openCount      = data.filter(i => !['closed'].includes(i.status)).length;

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Incidents</h1>
          <p className="page-description">AI incident lifecycle management, Art. 73 reporting, and corrective action tracking.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Create Incident
        </button>
      </div>

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Total Incidents', value: data.length,     color: undefined },
          { label: 'Open',            value: openCount,       color: openCount > 0 ? 'var(--warning)' : undefined },
          { label: 'Critical',        value: criticalCount,   color: criticalCount > 0 ? '#ef4444' : undefined },
          { label: 'Art.73 Pending',  value: seriousCount,    color: seriousCount > 0 ? '#ef4444' : undefined },
          { label: 'Data source',     value: isDemo ? 'Demo' : 'Live', color: isDemo ? 'var(--warning)' : 'var(--success)' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            {loading
              ? <div className="skeleton-pulse" style={{ height: 28, width: '40%', borderRadius: 4, marginTop: 2 }} />
              : <div className="kpi-value" style={k.color ? { color: k.color } : undefined}>{k.value}</div>
            }
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title">Incident Log</span>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`chip${statusFilter === f ? ' chip-accent' : ''}`}
                style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', textTransform: 'capitalize' }}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Detected</th>
              <th>Art.73 Deadline</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={5} cols={['8%', '30%', '14%', '12%', '12%', '12%', '10%']} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {statusFilter === 'all' ? 'No incidents yet. Click "+ Create Incident" to log one.' : `No incidents with status "${statusFilter}".`}
                </td>
              </tr>
            ) : filtered.map(inc => {
              const { label: sevLabel, cls: sevCls } = SEVERITY_MAP[inc.severity];
              return (
                <tr key={inc.id}>
                  <td>
                    <span
                      className={sevCls}
                      style={inc.severity === 'high' ? SEVERITY_HIGH_STYLE : undefined}
                    >
                      {sevLabel}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Link href={`/incidents/${inc.id}`} style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                      >
                        {inc.title}
                      </Link>
                      {inc.is_serious_incident && (
                        <span style={{
                          fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          padding: '0.1rem 0.4rem', borderRadius: 3,
                          background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440',
                        }}>
                          Art.73
                        </span>
                      )}
                    </div>
                    {inc.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.description}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {CATEGORY_LABELS[inc.category]}
                  </td>
                  <td><StatusBadge status={inc.status} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    {relativeTime(inc.detected_at)}
                  </td>
                  <td>
                    {inc.is_serious_incident
                      ? <DeadlineChip deadline={inc.art73_report_deadline} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      href={`/incidents/${inc.id}`}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem', textDecoration: 'none', display: 'inline-block' }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer meta */}
      {!loading && (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="status-dot" style={{ background: isDemo ? 'var(--warning)' : 'var(--success)' }} />
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {isDemo ? 'Demo data — connect Supabase to see live incidents' : `${data.length} incidents loaded from API`}
          </span>
        </div>
      )}

      <CreateIncidentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={incident => {
          setModalOpen(false);
          setData(prev => [incident, ...prev]);
          showToast(`Incident "${incident.title}" created`, 'success');
        }}
      />
    </div>
  );
}

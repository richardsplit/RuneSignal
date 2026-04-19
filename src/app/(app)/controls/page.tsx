'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import {
  controls as controlsApi,
  Control,
  ControlStatus,
  ControlSeverity,
  ControlStatusSummary,
  ApiError,
} from '@/lib/api';
import { ApiErrorBanner, SkeletonTable } from '@/components/Skeleton';

/* ─── Demo fallback ──────────────────────────────────────────────────── */
const DEMO_CONTROLS: Control[] = [
  {
    id: 'ctrl-001', tenant_id: 'demo', name: 'HITL Review Coverage',
    description: 'Ensures ≥95% of high-risk decisions have a completed HITL review within 24h.',
    regulation: 'eu_ai_act', clause_ref: 'article_14', policy_id: null,
    evaluation_type: 'scheduled', evaluation_query: null, evaluation_schedule: '0 * * * *',
    status: 'passing', last_evaluated_at: new Date(Date.now() - 3600000).toISOString(),
    consecutive_failures: 0, severity: 'high', owner: 'compliance@company.com',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'ctrl-002', tenant_id: 'demo', name: 'Anomaly Rate Threshold',
    description: 'Detects if the anomaly rate for any agent exceeds 5% over a rolling 24h window.',
    regulation: 'iso_42001', clause_ref: 'clause_8.2', policy_id: null,
    evaluation_type: 'scheduled', evaluation_query: null, evaluation_schedule: '0 */4 * * *',
    status: 'failing', last_evaluated_at: new Date(Date.now() - 7200000).toISOString(),
    consecutive_failures: 3, severity: 'critical', owner: null,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'ctrl-003', tenant_id: 'demo', name: 'Provenance Certificate Completeness',
    description: 'Every LLM inference must produce a signed provenance certificate.',
    regulation: 'eu_ai_act', clause_ref: 'article_13', policy_id: null,
    evaluation_type: 'real_time', evaluation_query: null, evaluation_schedule: null,
    status: 'passing', last_evaluated_at: new Date(Date.now() - 1800000).toISOString(),
    consecutive_failures: 0, severity: 'high', owner: 'engineering@company.com',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'ctrl-004', tenant_id: 'demo', name: 'Agent Suspension SLA',
    description: 'Suspended agents must not produce audit events within 15 minutes of suspension.',
    regulation: 'iso_42001', clause_ref: 'clause_8.4', policy_id: null,
    evaluation_type: 'scheduled', evaluation_query: null, evaluation_schedule: '*/15 * * * *',
    status: 'warning', last_evaluated_at: new Date(Date.now() - 900000).toISOString(),
    consecutive_failures: 1, severity: 'medium', owner: null,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'ctrl-005', tenant_id: 'demo', name: 'Firewall Block Escalation',
    description: 'High-risk firewall blocks must trigger a HITL review within 1 hour.',
    regulation: 'eu_ai_act', clause_ref: 'article_9', policy_id: null,
    evaluation_type: 'scheduled', evaluation_query: null, evaluation_schedule: '0 * * * *',
    status: 'not_evaluated', last_evaluated_at: null,
    consecutive_failures: 0, severity: 'medium', owner: null,
    created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

const DEMO_STATUS: ControlStatusSummary = {
  total: 5, passing: 2, failing: 1, warning: 1, not_evaluated: 1,
  by_regulation: {
    eu_ai_act:  { passing: 2, failing: 1, warning: 0 },
    iso_42001:  { passing: 0, failing: 0, warning: 1 },
  },
  recent_failures: [],
};

/* ─── Maps ───────────────────────────────────────────────────────────── */
const STATUS_MAP: Record<ControlStatus, { label: string; color: string }> = {
  passing:       { label: 'Passing',       color: 'var(--success)'    },
  failing:       { label: 'Failing',       color: '#ef4444'           },
  warning:       { label: 'Warning',       color: '#f59e0b'           },
  not_evaluated: { label: 'Not Evaluated', color: 'var(--text-muted)' },
};

const SEVERITY_MAP: Record<ControlSeverity, { label: string; cls: string }> = {
  low:      { label: 'Low',      cls: 'badge badge-success' },
  medium:   { label: 'Medium',   cls: 'badge badge-neutral' },
  high:     { label: 'High',     cls: 'badge'               },
  critical: { label: 'Critical', cls: 'badge badge-danger'  },
};

const SEVERITY_HIGH_STYLE: React.CSSProperties = {
  background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44',
};

const EVAL_TYPE_LABEL: Record<string, string> = {
  real_time: 'Real-time',
  scheduled: 'Scheduled',
  manual:    'Manual',
};

const REGULATION_LABELS: Record<string, string> = {
  eu_ai_act: 'EU AI Act',
  iso_42001: 'ISO 42001',
};

/* ─── Helpers ────────────────────────────────────────────────────────── */
function relativeTime(iso?: string | null): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Status badge ───────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: ControlStatus }) {
  const { label, color } = STATUS_MAP[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.125rem 0.5rem', borderRadius: 999,
      fontSize: '0.6875rem', fontWeight: 600,
      background: `${color}1a`, color, border: `1px solid ${color}33`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
}

/* ─── Control card ───────────────────────────────────────────────────── */
interface CardProps {
  control: Control;
  evaluating: boolean;
  onEvaluate: (id: string) => void;
  onOpenIncident: (control: Control) => void;
}

function ControlCard({ control, evaluating, onEvaluate, onOpenIncident }: CardProps) {
  const { color } = STATUS_MAP[control.status];
  const { label: sevLabel, cls: sevCls } = SEVERITY_MAP[control.severity];
  const isFailing = control.status === 'failing';

  return (
    <div style={{
      padding: '1rem 1.125rem',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-surface-2)',
      border: `1px solid ${isFailing ? '#ef444430' : 'var(--border)'}`,
      display: 'flex', flexDirection: 'column', gap: '0.625rem',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.125rem' }}>
            {control.name}
          </div>
          {control.description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {control.description}
            </div>
          )}
        </div>
        <StatusBadge status={control.status} />
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
        {control.regulation && (
          <span className="chip" style={{ fontSize: '0.6875rem', color: 'var(--accent)' }}>
            {REGULATION_LABELS[control.regulation] ?? control.regulation}
          </span>
        )}
        {control.clause_ref && (
          <span className="chip" style={{ fontSize: '0.6875rem' }}>{control.clause_ref}</span>
        )}
        <span className="chip" style={{ fontSize: '0.6875rem' }}>{EVAL_TYPE_LABEL[control.evaluation_type]}</span>
        <span
          className={sevCls}
          style={control.severity === 'high' ? SEVERITY_HIGH_STYLE : { fontSize: '0.6875rem' }}
        >
          {sevLabel}
        </span>
        {control.consecutive_failures > 0 && (
          <span style={{ fontSize: '0.6875rem', color: '#ef4444', fontWeight: 600 }}>
            {control.consecutive_failures} consecutive fail{control.consecutive_failures > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.125rem' }}>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {control.owner && <span style={{ marginRight: '0.75rem' }}>👤 {control.owner}</span>}
          Last evaluated: {relativeTime(control.last_evaluated_at)}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {isFailing && (
            <button
              className="btn btn-danger"
              style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
              onClick={() => onOpenIncident(control)}
            >
              Open Incident
            </button>
          )}
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
            onClick={() => onEvaluate(control.id)}
            disabled={evaluating}
          >
            {evaluating ? '…' : 'Evaluate Now'}
          </button>
        </div>
      </div>

      {/* Failing bar */}
      {isFailing && (
        <div style={{ height: 2, background: `linear-gradient(90deg, #ef444480, transparent)`, borderRadius: 1, marginTop: '0.25rem' }} />
      )}
    </div>
  );
}

/* ─── Create Incident Modal (lightweight) ────────────────────────────── */
interface IncidentModalProps {
  control: Control | null;
  onClose: () => void;
  onCreated: () => void;
}

function OpenIncidentModal({ control, onClose, onCreated }: IncidentModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [reportedBy, setReportedBy] = useState('');

  const overlayRef = React.useRef<HTMLDivElement>(null);
  const handleOverlayClick = (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose(); };

  if (!control) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedBy.trim()) { showToast('Reported by is required', 'error'); return; }
    setSubmitting(true);
    try {
      const { incidents: incidentsApi } = await import('@/lib/api');
      await incidentsApi.create({
        title: `Control breach: ${control.name}`,
        description: control.description ?? undefined,
        severity: control.severity === 'critical' ? 'critical' : control.severity === 'high' ? 'high' : 'medium',
        category: 'compliance_gap',
        reported_by: reportedBy.trim(),
      });
      showToast('Incident created from control breach', 'success');
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to create incident', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)',
    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div ref={overlayRef} onClick={handleOverlayClick} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Open Incident from Control</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--bg-surface-2)', borderRadius: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Control breach: </strong>{control.name}<br />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {control.regulation && `${REGULATION_LABELS[control.regulation] ?? control.regulation}`}
              {control.clause_ref && ` · ${control.clause_ref}`}
              {` · ${control.consecutive_failures} consecutive failure${control.consecutive_failures !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reported By <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input style={inputStyle} value={reportedBy} onChange={e => setReportedBy(e.target.value)} placeholder="email or identifier" required autoFocus />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function ControlsPage() {
  const { showToast } = useToast();

  const [data, setData]               = useState<Control[]>([]);
  const [summary, setSummary]         = useState<ControlStatusSummary | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [isDemo, setIsDemo]           = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ControlStatus>('all');
  const [evaluating, setEvaluating]   = useState<Record<string, boolean>>({});
  const [seeding, setSeeding]         = useState(false);
  const [incidentControl, setIncidentControl] = useState<Control | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statusRes] = await Promise.all([
        controlsApi.list({ limit: 100 }),
        controlsApi.status(),
      ]);
      setData(listRes.controls);
      setSummary(statusRes);
      setIsDemo(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Network error';
      setError(msg);
      setData(DEMO_CONTROLS);
      setSummary(DEMO_STATUS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === 'all' ? data : data.filter(c => c.status === statusFilter);

  const handleEvaluate = async (id: string) => {
    setEvaluating(prev => ({ ...prev, [id]: true }));
    try {
      const res = await controlsApi.evaluate(id);
      showToast(`Evaluation: ${res.result}`, res.result === 'pass' ? 'success' : 'error');
      const [listRes, statusRes] = await Promise.all([controlsApi.list({ limit: 100 }), controlsApi.status()]);
      setData(listRes.controls);
      setSummary(statusRes);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Evaluation failed', 'error');
    } finally {
      setEvaluating(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await controlsApi.seed();
      showToast(`${res.seeded} default controls seeded`, 'success');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Seeding failed', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const STATUS_FILTERS: Array<'all' | ControlStatus> = ['all', 'passing', 'failing', 'warning', 'not_evaluated'];

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Compliance Controls</h1>
          <p className="page-description">Continuous monitoring against EU AI Act and ISO 42001 control objectives.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {(!loading && data.length === 0) && (
            <button className="btn btn-outline" onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Seeding…' : 'Seed Defaults'}
            </button>
          )}
        </div>
      </div>

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Total Controls', value: summary?.total ?? 0,         color: undefined },
          { label: 'Passing',        value: summary?.passing ?? 0,       color: summary && summary.passing > 0 ? 'var(--success)' : undefined },
          { label: 'Failing',        value: summary?.failing ?? 0,       color: summary && summary.failing > 0 ? '#ef4444' : undefined },
          { label: 'Warning',        value: summary?.warning ?? 0,       color: summary && summary.warning > 0 ? '#f59e0b' : undefined },
          { label: 'Not Evaluated',  value: summary?.not_evaluated ?? 0, color: summary && summary.not_evaluated > 0 ? 'var(--text-muted)' : undefined },
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

      {/* Control cards */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title">Controls</span>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`chip${statusFilter === f ? ' chip-accent' : ''}`}
                style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', textTransform: f === 'not_evaluated' ? 'none' : 'capitalize' }}
              >
                {f === 'all' ? 'All' : f === 'not_evaluated' ? 'Not Evaluated' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {!loading && data.length === 0 && (
            <button className="btn btn-outline" style={{ fontSize: '0.8125rem' }} onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Seeding…' : '+ Seed Defaults'}
            </button>
          )}
        </div>

        <div style={{ padding: '1rem 1.125rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton-pulse" style={{ height: 110, borderRadius: 8 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {statusFilter === 'all'
                ? <span>No controls configured. <button className="btn btn-outline" style={{ fontSize: '0.8125rem', marginLeft: '0.5rem' }} onClick={handleSeed} disabled={seeding}>{seeding ? 'Seeding…' : 'Seed defaults'}</button></span>
                : `No controls with status "${statusFilter}".`
              }
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '0.75rem' }}>
              {filtered.map(control => (
                <ControlCard
                  key={control.id}
                  control={control}
                  evaluating={!!evaluating[control.id]}
                  onEvaluate={handleEvaluate}
                  onOpenIncident={setIncidentControl}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Failing controls detail table */}
      {summary && (summary.recent_failures?.length ?? 0) > 0 && (
        <div className="surface" style={{ overflow: 'hidden', marginTop: '1.25rem' }}>
          <div className="panel-header">
            <span className="panel-title" style={{ color: '#ef4444' }}>Recent Failures</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Control</th>
                <th>Regulation</th>
                <th>Failed At</th>
                <th>Detail</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(summary.recent_failures ?? []).map((f, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{f.control?.name ?? f.control_id}</td>
                  <td>{f.control?.regulation ? (REGULATION_LABELS[f.control.regulation] ?? f.control.regulation) : '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{relativeTime(f.evaluated_at)}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{JSON.stringify(f.detail)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {f.control && (
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => setIncidentControl(f.control!)}
                      >
                        Open Incident
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!loading && (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="status-dot" style={{ background: isDemo ? 'var(--warning)' : 'var(--success)' }} />
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {isDemo ? 'Demo data — connect Supabase to see live controls' : `${data.length} controls loaded from API`}
          </span>
        </div>
      )}

      <OpenIncidentModal
        control={incidentControl}
        onClose={() => setIncidentControl(null)}
        onCreated={() => { setIncidentControl(null); showToast('Incident opened', 'success'); }}
      />
    </div>
  );
}

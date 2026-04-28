'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { incidents as incidentsApi, Incident, IncidentStatus, IncidentSeverity, ApiError } from '@/lib/api';
import { ApiErrorBanner, SkeletonTable } from '@/components/Skeleton';
import { CreateIncidentModal, CATEGORY_LABELS } from '@/components/features/incidents/CreateIncidentModal';

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
  if (days < 0)  { bg = 'var(--danger)'; label = 'Overdue'; }
  else if (days <= 2) { bg = 'var(--danger)'; label = `${days}d ⚠`; }
  else if (days <= 7) { bg = 'var(--warning)'; }
  const cls = bg === 'var(--danger)' ? 'chip chip-danger' : bg === 'var(--warning)' ? 'chip chip-warning' : 'chip chip-success';
  return <span className={cls} style={{ fontSize: '0.6875rem' }}>{label}</span>;
}

const STATUS_MAP: Record<IncidentStatus, { label: string; color: string; chipClass: string }> = {
  detected:      { label: 'Detected',      color: 'var(--text-tertiary)', chipClass: 'chip'              },
  investigating: { label: 'Investigating', color: 'var(--info)',          chipClass: 'chip chip-accent'  },
  mitigated:     { label: 'Mitigated',     color: 'var(--warning)',       chipClass: 'chip chip-warning' },
  reported:      { label: 'Reported',      color: 'var(--success)',       chipClass: 'chip chip-success' },
  closed:        { label: 'Closed',        color: 'var(--text-tertiary)', chipClass: 'chip'              },
};

const SEVERITY_MAP: Record<IncidentSeverity, { label: string; cls: string }> = {
  low:      { label: 'Low',      cls: 'badge badge-success'  },
  medium:   { label: 'Medium',   cls: 'badge badge-neutral'  },
  high:     { label: 'High',     cls: 'badge'                },
  critical: { label: 'Critical', cls: 'badge badge-danger'   },
};

const SEVERITY_HIGH_STYLE: React.CSSProperties = {
  background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning-border)',
};

/* ─── Status badge ───────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: IncidentStatus }) {
  const { label, chipClass } = STATUS_MAP[status];
  return <span className={chipClass} style={{ fontSize: '0.6875rem' }}>{label}</span>;
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
          { label: 'Critical',        value: criticalCount,   color: criticalCount > 0 ? 'var(--danger)' : undefined },
          { label: 'Art.73 Pending',  value: seriousCount,    color: seriousCount > 0 ? 'var(--danger)' : undefined },
          { label: 'Data source',     value: isDemo ? 'Demo' : 'Live', color: isDemo ? 'var(--warning)' : 'var(--success)' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            {loading
              ? <div className="skeleton-pulse" style={{ height: 28, width: '40%', borderRadius: 'var(--radius-xs)', marginTop: 2 }} />
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
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
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
                        <span className="chip chip-danger" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                          Art.73
                        </span>
                      )}
                    </div>
                    {inc.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.125rem', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.description}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {CATEGORY_LABELS[inc.category]}
                  </td>
                  <td><StatusBadge status={inc.status} /></td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                    {relativeTime(inc.detected_at)}
                  </td>
                  <td>
                    {inc.is_serious_incident
                      ? <DeadlineChip deadline={inc.art73_report_deadline} />
                      : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>—</span>
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
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
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


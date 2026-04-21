'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { controls as controlsApi, Control, ControlStatus, ControlStatusSummary, ApiError } from '@/lib/api';
import { ApiErrorBanner } from '@/components/Skeleton';
import { ControlCard, REGULATION_LABELS, relativeTime } from '@/components/features/controls/ControlCard';
import { OpenIncidentModal } from '@/components/features/controls/OpenIncidentModal';

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

'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';

interface ReportSummary {
  total_audit_events: number;
  signed_events: number;
  signature_coverage_pct: number;
  total_agents: number;
  active_agents: number;
  policy_violations: number;
  hitl_tickets_created: number;
  hitl_tickets_resolved: number;
  hitl_resolution_rate_pct: number;
  firewall_evaluations: number;
  firewall_blocks: number;
  firewall_block_rate_pct: number;
}

interface PolicyPack {
  name: string;
  category: string;
  tier_required: string;
  installed_at: string;
  policies_count: number;
}

interface HitlTicket {
  id: string;
  title: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  reviewer_id: string | null;
}

interface TopEvent {
  event_type: string;
  count: number;
}

interface FullReport {
  id: string;
  generated_at: string;
  period: { from: string; to: string };
  framework: string;
  summary: ReportSummary;
  installed_policy_packs: PolicyPack[];
  hitl_trail: {
    tickets: HitlTicket[];
    avg_resolution_hours: number | null;
    overdue_tickets: number;
  };
  audit_trail: {
    events_by_module: Record<string, number>;
    top_event_types: TopEvent[];
  };
}

const FRAMEWORKS = [
  { value: 'general', label: 'General Audit' },
  { value: 'soc2', label: 'SOC 2 Type II' },
  { value: 'hipaa', label: 'HIPAA' },
  { value: 'gdpr', label: 'GDPR' },
  { value: 'pci-dss', label: 'PCI-DSS' },
];

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: 'good' | 'warn' | 'bad';
}) {
  const color =
    highlight === 'good' ? 'var(--success)'
    : highlight === 'warn' ? 'var(--warning)'
    : highlight === 'bad' ? 'var(--danger)'
    : undefined;

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="t-caption" style={{ marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

export default function ComplianceReportsPage() {
  const { tenantId } = useTenant();
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [framework, setFramework] = useState('general');
  const [days, setDays] = useState(30);

  const fetchReport = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);

    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    try {
      const res = await fetch(
        `/api/v1/compliance/reports?framework=${framework}&from=${from}&to=${to}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to generate report');
      }
      setReport(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RuneSignal_Compliance_${report.framework.toUpperCase()}_${report.period.from.slice(0, 10)}_${report.period.to.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (tenantId) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const s = report?.summary;

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Compliance Reports</h1>
          <p className="page-description">Generate point-in-time compliance evidence reports for audits and regulators</p>
        </div>
        {report && (
          <button className="btn btn-primary" onClick={handleExport}>Export JSON</button>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Framework</label>
          <select className="form-input" value={framework} onChange={e => setFramework(e.target.value)}>
            {FRAMEWORKS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Period</label>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {PRESETS.map(p => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`btn ${days === p.days ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8125rem' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={fetchReport} disabled={loading || !tenantId}>
          {loading ? 'Generating…' : 'Generate Report'}
        </button>
      </div>

      {error && <div className="callout callout-danger" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      {!report && !loading && (
        <div className="empty-state">
          <p className="empty-state-body">Select a framework and period, then click Generate Report</p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <p className="t-body-sm text-tertiary">Compiling compliance evidence…</p>
        </div>
      )}

      {report && s && (
        <>
          {/* Report metadata */}
          <div className="surface" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <span className="t-eyebrow">Report ID</span>
              <div className="t-mono" style={{ color: 'var(--text-secondary)', marginTop: '0.125rem', fontSize: '0.75rem' }}>{report.id}</div>
            </div>
            <div>
              <span className="t-eyebrow">Framework</span>
              <div style={{ color: 'var(--text-primary)', textTransform: 'uppercase', marginTop: '0.125rem', fontSize: '0.875rem', fontWeight: 600 }}>{report.framework}</div>
            </div>
            <div>
              <span className="t-eyebrow">Period</span>
              <div className="text-secondary" style={{ marginTop: '0.125rem', fontSize: '0.8125rem' }}>{report.period.from.slice(0, 10)} → {report.period.to.slice(0, 10)}</div>
            </div>
            <div>
              <span className="t-eyebrow">Generated</span>
              <div className="text-secondary" style={{ marginTop: '0.125rem', fontSize: '0.8125rem' }}>{new Date(report.generated_at).toLocaleString()}</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: '1.25rem' }}>
            <MetricCard label="Audit Events" value={s.total_audit_events.toLocaleString()} sub={`${s.signed_events.toLocaleString()} signed`} />
            <MetricCard label="Signature Coverage" value={`${s.signature_coverage_pct}%`} highlight={s.signature_coverage_pct === 100 ? 'good' : s.signature_coverage_pct >= 95 ? 'warn' : 'bad'} />
            <MetricCard label="Active Agents" value={s.active_agents} sub={`${s.total_agents} total`} />
            <MetricCard label="Policy Violations" value={s.policy_violations} highlight={s.policy_violations === 0 ? 'good' : s.policy_violations < 5 ? 'warn' : 'bad'} />
            <MetricCard label="HITL Resolution Rate" value={`${s.hitl_resolution_rate_pct}%`} sub={`${s.hitl_tickets_resolved}/${s.hitl_tickets_created} tickets`} highlight={s.hitl_resolution_rate_pct >= 95 ? 'good' : s.hitl_resolution_rate_pct >= 80 ? 'warn' : 'bad'} />
            <MetricCard label="Firewall Block Rate" value={`${s.firewall_block_rate_pct}%`} sub={`${s.firewall_blocks} blocks / ${s.firewall_evaluations} evals`} highlight={s.firewall_block_rate_pct < 5 ? 'good' : s.firewall_block_rate_pct < 15 ? 'warn' : 'bad'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {/* Top Event Types */}
            <div className="surface" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Top Audit Event Types</h3>
              {report.audit_trail.top_event_types.length === 0 ? (
                <p className="t-body-sm text-tertiary">No events in this period</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {report.audit_trail.top_event_types.map(e => (
                    <div key={e.event_type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="t-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{e.event_type}</span>
                      <span className="badge badge-neutral">{e.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HITL Trail */}
            <div className="surface" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>HITL Oversight Trail</h3>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {report.hitl_trail.avg_resolution_hours !== null && (
                    <span className="t-caption">Avg: {report.hitl_trail.avg_resolution_hours}h</span>
                  )}
                  {report.hitl_trail.overdue_tickets > 0 && (
                    <span className="t-caption" style={{ color: 'var(--warning)' }}>{report.hitl_trail.overdue_tickets} overdue</span>
                  )}
                </div>
              </div>
              {report.hitl_trail.tickets.length === 0 ? (
                <p className="t-body-sm text-tertiary">No HITL tickets in this period</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {report.hitl_trail.tickets.slice(0, 20).map(t => (
                    <div key={t.id} className="surface" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0.625rem', background: 'var(--surface-2)' }}>
                      <span className="t-body-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', color: 'var(--text-secondary)' }}>{t.title}</span>
                      <span style={{ color: t.status === 'approved' ? 'var(--success)' : t.status === 'rejected' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0, marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>{t.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Policy Packs */}
          {report.installed_policy_packs.length > 0 && (
            <div className="surface" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Installed Regulatory Policy Packs</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {report.installed_policy_packs.map(pack => (
                  <div key={pack.name} className="surface" style={{ padding: '0.875rem 1rem', background: 'var(--surface-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{pack.name}</span>
                      <span className="badge badge-success">Active</span>
                    </div>
                    <div className="t-caption">{pack.policies_count} policies · {pack.category}</div>
                    <div className="t-caption" style={{ marginTop: '0.25rem', color: 'var(--text-tertiary)' }}>Installed {new Date(pack.installed_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

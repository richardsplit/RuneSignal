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
    highlight === 'good'
      ? '#10b981'
      : highlight === 'warn'
      ? '#f59e0b'
      : highlight === 'bad'
      ? '#f43f5e'
      : '#a3a3a3';

  return (
    <div
      style={{
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 8,
        padding: '16px 20px',
      }}
    >
      <div style={{ fontSize: 12, color: '#737373', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#525252', marginTop: 4 }}>{sub}</div>}
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
    a.download = `TrustLayer_Compliance_${report.framework.toUpperCase()}_${report.period.from.slice(0, 10)}_${report.period.to.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (tenantId) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const s = report?.summary;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#e5e5e5',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '32px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Compliance Reports
          </h1>
          <p style={{ color: '#737373', fontSize: 14, marginTop: 4 }}>
            Generate point-in-time compliance evidence reports for audits and regulators
          </p>
        </div>
        {report && (
          <button
            onClick={handleExport}
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Export JSON
          </button>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 32,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#737373', marginBottom: 4 }}>Framework</div>
          <select
            value={framework}
            onChange={e => setFramework(e.target.value)}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              color: '#e5e5e5',
              padding: '8px 12px',
              fontSize: 14,
            }}
          >
            {FRAMEWORKS.map(f => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#737373', marginBottom: 4 }}>Period</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRESETS.map(p => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                style={{
                  background: days === p.days ? '#10b981' : '#1a1a1a',
                  border: `1px solid ${days === p.days ? '#10b981' : '#2a2a2a'}`,
                  borderRadius: 6,
                  color: days === p.days ? '#fff' : '#a3a3a3',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={fetchReport}
          disabled={loading || !tenantId}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '9px 20px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {loading ? 'Generating…' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#1c0a0a',
            border: '1px solid #7f1d1d',
            borderRadius: 8,
            padding: 16,
            color: '#f87171',
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {!report && !loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 0',
            color: '#525252',
          }}
        >
          Select a framework and period, then click Generate Report
        </div>
      )}

      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 0',
            color: '#737373',
          }}
        >
          Compiling compliance evidence…
        </div>
      )}

      {report && s && (
        <>
          {/* Report header */}
          <div
            style={{
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 24,
              display: 'flex',
              gap: 32,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#525252', textTransform: 'uppercase', letterSpacing: 1 }}>
                Report ID
              </div>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#a3a3a3' }}>
                {report.id}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#525252', textTransform: 'uppercase', letterSpacing: 1 }}>
                Framework
              </div>
              <div style={{ fontSize: 13, color: '#e5e5e5', textTransform: 'uppercase' }}>
                {report.framework}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#525252', textTransform: 'uppercase', letterSpacing: 1 }}>
                Period
              </div>
              <div style={{ fontSize: 13, color: '#a3a3a3' }}>
                {report.period.from.slice(0, 10)} → {report.period.to.slice(0, 10)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#525252', textTransform: 'uppercase', letterSpacing: 1 }}>
                Generated
              </div>
              <div style={{ fontSize: 13, color: '#a3a3a3' }}>
                {new Date(report.generated_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 32,
            }}
          >
            <MetricCard
              label="Audit Events"
              value={s.total_audit_events.toLocaleString()}
              sub={`${s.signed_events.toLocaleString()} signed`}
            />
            <MetricCard
              label="Signature Coverage"
              value={`${s.signature_coverage_pct}%`}
              highlight={s.signature_coverage_pct === 100 ? 'good' : s.signature_coverage_pct >= 95 ? 'warn' : 'bad'}
            />
            <MetricCard
              label="Active Agents"
              value={s.active_agents}
              sub={`${s.total_agents} total`}
            />
            <MetricCard
              label="Policy Violations"
              value={s.policy_violations}
              highlight={s.policy_violations === 0 ? 'good' : s.policy_violations < 5 ? 'warn' : 'bad'}
            />
            <MetricCard
              label="HITL Resolution Rate"
              value={`${s.hitl_resolution_rate_pct}%`}
              sub={`${s.hitl_tickets_resolved}/${s.hitl_tickets_created} tickets`}
              highlight={s.hitl_resolution_rate_pct >= 95 ? 'good' : s.hitl_resolution_rate_pct >= 80 ? 'warn' : 'bad'}
            />
            <MetricCard
              label="Firewall Block Rate"
              value={`${s.firewall_block_rate_pct}%`}
              sub={`${s.firewall_blocks} blocks / ${s.firewall_evaluations} evals`}
              highlight={s.firewall_block_rate_pct < 5 ? 'good' : s.firewall_block_rate_pct < 15 ? 'warn' : 'bad'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            {/* Top Event Types */}
            <div
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                Top Audit Event Types
              </div>
              {report.audit_trail.top_event_types.length === 0 ? (
                <div style={{ color: '#525252', fontSize: 13 }}>No events in this period</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {report.audit_trail.top_event_types.map(e => (
                    <div
                      key={e.event_type}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: '#a3a3a3', fontFamily: 'monospace' }}>
                        {e.event_type}
                      </span>
                      <span
                        style={{
                          background: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          borderRadius: 4,
                          padding: '1px 8px',
                          fontSize: 12,
                          color: '#737373',
                        }}
                      >
                        {e.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HITL Trail */}
            <div
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>HITL Oversight Trail</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#737373' }}>
                  {report.hitl_trail.avg_resolution_hours !== null && (
                    <span>
                      Avg: {report.hitl_trail.avg_resolution_hours}h
                    </span>
                  )}
                  {report.hitl_trail.overdue_tickets > 0 && (
                    <span style={{ color: '#f59e0b' }}>
                      {report.hitl_trail.overdue_tickets} overdue
                    </span>
                  )}
                </div>
              </div>
              {report.hitl_trail.tickets.length === 0 ? (
                <div style={{ color: '#525252', fontSize: 13 }}>No HITL tickets in this period</div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    maxHeight: 240,
                    overflowY: 'auto',
                  }}
                >
                  {report.hitl_trail.tickets.slice(0, 20).map(t => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        padding: '6px 8px',
                        background: '#1a1a1a',
                        borderRadius: 4,
                      }}
                    >
                      <span
                        style={{
                          color: '#a3a3a3',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 200,
                        }}
                      >
                        {t.title}
                      </span>
                      <span
                        style={{
                          color:
                            t.status === 'approved'
                              ? '#10b981'
                              : t.status === 'rejected'
                              ? '#f43f5e'
                              : '#f59e0b',
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Installed Policy Packs */}
          {report.installed_policy_packs.length > 0 && (
            <div
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                Installed Regulatory Policy Packs
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 12,
                }}
              >
                {report.installed_policy_packs.map(pack => (
                  <div
                    key={pack.name}
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: 6,
                      padding: '12px 16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{pack.name}</span>
                      <span
                        style={{
                          fontSize: 10,
                          textTransform: 'uppercase',
                          background: '#10b981',
                          color: '#fff',
                          borderRadius: 3,
                          padding: '1px 6px',
                        }}
                      >
                        Active
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#737373' }}>
                      {pack.policies_count} policies · {pack.category}
                    </div>
                    <div style={{ fontSize: 11, color: '#525252', marginTop: 4 }}>
                      Installed {new Date(pack.installed_at).toLocaleDateString()}
                    </div>
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

import React from 'react';
import Link from 'next/link';

/* ─── Types ──────────────────────────────────────────────────────────── */
type ModuleStatus = 'active' | 'warning' | 'critical' | 'inactive';

interface Module {
  label: string;
  href: string;
  kpi: string;
  kpiUnit: string;
  kpiColor?: string;
  description: string;
  status: ModuleStatus;
  delta?: string;
}

interface AlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  module: string;
  ts: string;
}

/* ─── Static data ────────────────────────────────────────────────────── */
const MODULES: Module[] = [
  {
    label: 'Provenance',
    href: '/provenance',
    kpi: '14,204',
    kpiUnit: 'certs today',
    kpiColor: 'var(--success)',
    description: 'Cryptographic output verification and certificate issuance.',
    status: 'active',
    delta: '+2.1%',
  },
  {
    label: 'Agent Identity',
    href: '/identity',
    kpi: '42',
    kpiUnit: 'registered',
    description: 'Scoped credentials, manifests and identity lifecycle.',
    status: 'active',
    delta: '+3',
  },
  {
    label: 'Conflict Arbiter',
    href: '/conflict',
    kpi: '7',
    kpiUnit: 'queued',
    kpiColor: 'var(--warning)',
    description: 'Semantic intent mediation across conflicting agent actions.',
    status: 'warning',
    delta: '1 blocked',
  },
  {
    label: 'Review Queue',
    href: '/exceptions',
    kpi: '24',
    kpiUnit: 'open',
    kpiColor: 'var(--danger)',
    description: 'Human-in-the-loop routing for flagged agent decisions.',
    status: 'critical',
    delta: '1 critical',
  },
  {
    label: 'Risk & Insurance',
    href: '/insurance',
    kpi: '42',
    kpiUnit: 'fleet score',
    kpiColor: 'var(--warning)',
    description: 'Actuarial modeling, premiums and active claim tracking.',
    status: 'warning',
    delta: '1 active claim',
  },
  {
    label: 'Policy Engine',
    href: '/moral',
    kpi: 'v2.1',
    kpiUnit: 'soul active',
    kpiColor: 'var(--accent)',
    description: 'Corporate SOUL rules, ethical guardrails and policy version.',
    status: 'active',
  },
  {
    label: 'Explainability',
    href: '/explain',
    kpi: '1,204',
    kpiUnit: 'explanations',
    description: 'Audit-grade rationale generation for agent decisions.',
    status: 'active',
    delta: '+48',
  },
  {
    label: 'Governance Intel',
    href: '/compliance',
    kpi: '3',
    kpiUnit: 'frameworks',
    description: 'Regulation-mapped compliance controls and evidence tracking.',
    status: 'active',
  },
  {
    label: 'Compliance Reports',
    href: '/compliance/reports',
    kpi: '2',
    kpiUnit: 'reports ready',
    description: 'Exportable evidence bundles for EU AI Act, NIST and SOC 2.',
    status: 'active',
  },
  {
    label: 'Anomaly Detection',
    href: '/anomaly',
    kpi: '0',
    kpiUnit: 'active alerts',
    kpiColor: 'var(--success)',
    description: 'Behavioral drift and statistical anomaly monitoring.',
    status: 'active',
  },
  {
    label: 'NHI Lifecycle',
    href: '/nhi',
    kpi: '18',
    kpiUnit: 'credentials',
    description: 'Non-human identity rotation scheduling and spawn graph.',
    status: 'active',
    delta: '2 expiring',
  },
  {
    label: 'FinOps',
    href: '/finops',
    kpi: '$0.42',
    kpiUnit: 'today spend',
    kpiColor: 'var(--accent)',
    description: 'Token cost attribution, budget guardrails and chargeback.',
    status: 'active',
  },
  {
    label: 'Data Residency',
    href: '/sovereignty',
    kpi: 'EU+US',
    kpiUnit: 'regions',
    description: 'Data locality enforcement and cross-border transfer controls.',
    status: 'active',
  },
  {
    label: 'A2A Gateway',
    href: '/a2a',
    kpi: '3',
    kpiUnit: 'active sessions',
    description: 'Agent-to-agent orchestration with trust negotiation.',
    status: 'active',
  },
  {
    label: 'Red Teaming',
    href: '/red-team',
    kpi: '87',
    kpiUnit: 'resilience score',
    kpiColor: 'var(--success)',
    description: 'Adversarial probing, jailbreak tests and resilience scoring.',
    status: 'active',
    delta: '+2 pts',
  },
  {
    label: 'Physical AI',
    href: '/physical',
    kpi: '0',
    kpiUnit: 'physical agents',
    description: 'Embodied agent integration and physical action governance.',
    status: 'inactive',
  },
];

const ALERTS: AlertItem[] = [
  { id: 'exc-5091', severity: 'critical', title: 'Unrecognized wire transfer schema — FinanceBot', module: 'Review Queue', ts: '3 min ago' },
  { id: 'int-992',  severity: 'warning',  title: 'Intent collision queued — SDR_Bot vs FinanceBot',  module: 'Conflict Arbiter', ts: '11 min ago' },
  { id: 'prov-44',  severity: 'warning',  title: 'Model version anomaly detected — GPT-4o-mini',    module: 'Provenance', ts: '38 min ago' },
  { id: 'agt-003',  severity: 'info',     title: 'SlackBot_Dev suspended after 12 violations',      module: 'Identity', ts: '1 hr ago' },
];

/* ─── Status pill ────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: ModuleStatus }) {
  const map: Record<ModuleStatus, { label: string; cls: string }> = {
    active:   { label: 'Active',    cls: 'badge badge-success' },
    warning:  { label: 'Review',    cls: 'badge badge-warning' },
    critical: { label: 'Critical',  cls: 'badge badge-danger'  },
    inactive: { label: 'Inactive',  cls: 'badge badge-neutral' },
  };
  const { label, cls } = map[status];
  return <span className={cls}>{label}</span>;
}

/* ─── Alert row ──────────────────────────────────────────────────────── */
function AlertRow({ alert }: { alert: AlertItem }) {
  const color = alert.severity === 'critical'
    ? 'var(--danger)'
    : alert.severity === 'warning'
    ? 'var(--warning)'
    : 'var(--info)';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      padding: '0.75rem 1.25rem',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        marginTop: '5px',
        ...(alert.severity === 'critical' ? { boxShadow: `0 0 5px ${color}` } : {}),
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.25rem' }}>
          {alert.title}
        </p>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {alert.module} · {alert.ts}
        </p>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <div style={{ maxWidth: '1200px' }}>

      {/* Platform Health Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '0.625rem 1rem',
        background: 'var(--bg-surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 6px var(--success)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--success)' }}>
            All Systems Operational
          </span>
        </div>
        <span style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Governance Engine: <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Active</span>
          </span>
        </div>
        <span style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Last audit: <span style={{ color: 'var(--text-secondary)' }}>2 min ago</span>
        </span>
      </div>

      {/* Page heading */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Platform Overview</h1>
        <p className="page-description">
          Real-time governance status across all active modules.
        </p>
      </div>

      {/* Top KPI strip — row 1 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        background: 'var(--border-subtle)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        overflow: 'hidden',
      }}>
        {[
          { label: 'Registered Agents',    value: '42',     accentColor: undefined },
          { label: 'Certificates (today)', value: '14,204', accentColor: undefined },
          { label: 'Open Exceptions',      value: '24',     accentColor: 'var(--danger)'  },
          { label: 'Queued Collisions',    value: '7',      accentColor: 'var(--warning)' },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'var(--bg-surface-1)',
            padding: '1.25rem 1.5rem',
          }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.accentColor ?? undefined }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* KPI strip — row 2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        background: 'var(--border-subtle)',
        border: '1px solid var(--border-default)',
        borderTop: 'none',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: '1.75rem',
      }}>
        {[
          { label: 'Active Anomalies',  value: '0',      accentColor: undefined },
          { label: 'Fleet Resilience',  value: '87%',    accentColor: 'var(--success)' },
          { label: 'SOUL Version',      value: 'v2.1',   accentColor: 'var(--accent)' },
          { label: 'Red Team Score',    value: '87/100', accentColor: 'var(--success)' },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'var(--bg-surface-2)',
            padding: '1.25rem 1.5rem',
          }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.accentColor ?? undefined, fontSize: '1.5rem' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid: modules 3-col + alerts sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Module cards — 3-column grid */}
        {MODULES.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            background: 'var(--border-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {MODULES.map((mod) => (
              <Link
                key={mod.href}
                href={mod.href}
                style={{
                  display: 'block',
                  background: 'var(--bg-surface-1)',
                  padding: '1.25rem',
                  textDecoration: 'none',
                  transition: 'background var(--t-fast)',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-2)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-1)')}
              >
                {/* Top row: label + badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {mod.label}
                  </span>
                  <StatusBadge status={mod.status} />
                </div>

                {/* KPI */}
                <div style={{ marginBottom: '0.625rem' }}>
                  <span style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: mod.kpiColor ?? 'var(--text-primary)',
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {mod.kpi}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                    {mod.kpiUnit}
                  </span>
                </div>

                {/* Description */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {mod.description}
                  </p>
                  {mod.delta && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {mod.delta}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state-title">No modules registered</p>
            <p className="empty-state-body">Register your first AI agent to start generating provenance certificates.</p>
          </div>
        )}

        {/* Alert feed */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Recent Alerts</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 5px var(--danger)', display: 'inline-block' }} />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Live</span>
            </span>
          </div>

          {ALERTS.length > 0 ? (
            <div>
              {ALERTS.map(a => <AlertRow key={a.id} alert={a} />)}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem 1.25rem' }}>
              <p className="empty-state-title">No active alerts</p>
              <p className="empty-state-body">All modules are operating normally.</p>
            </div>
          )}

          <div style={{ padding: '0.75rem 1.25rem' }}>
            <Link
              href="/exceptions"
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'color var(--t-fast)',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
            >
              View all exceptions →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

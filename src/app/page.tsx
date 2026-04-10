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
    kpiUnit: 'certificates today',
    kpiColor: 'var(--success)',
    description: 'Cryptographic output verification',
    status: 'active',
    delta: '+2.1%',
  },
  {
    label: 'Agent Identity',
    href: '/identity',
    kpi: '42',
    kpiUnit: 'agents registered',
    description: 'Scoped credentials & manifests',
    status: 'active',
    delta: '+3',
  },
  {
    label: 'Conflict Arbiter',
    href: '/conflict',
    kpi: '7',
    kpiUnit: 'queued collisions',
    kpiColor: 'var(--warning)',
    description: 'Semantic intent mediation',
    status: 'warning',
    delta: '1 blocked',
  },
  {
    label: 'Review Queue',
    href: '/exceptions',
    kpi: '24',
    kpiUnit: 'open exceptions',
    kpiColor: 'var(--danger)',
    description: 'Human-in-the-loop routing',
    status: 'critical',
    delta: '1 critical',
  },
  {
    label: 'Risk & Insurance',
    href: '/insurance',
    kpi: '42',
    kpiUnit: 'fleet risk score',
    kpiColor: 'var(--warning)',
    description: 'Actuarial modeling & premiums',
    status: 'warning',
    delta: '1 active claim',
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

      {/* Page heading */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '1.375rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: '0.25rem',
        }}>
          Platform Overview
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Real-time governance status across all active modules.
        </p>
      </div>

      {/* Top KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        background: 'var(--border-subtle)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: '1.75rem',
      }}>
        {[
          { label: 'Registered Agents',    value: '42',     accent: false },
          { label: 'Certificates (today)', value: '14,204', accent: false },
          { label: 'Open Exceptions',      value: '24',     accent: true,  accentColor: 'var(--danger)'  },
          { label: 'Queued Collisions',    value: '7',      accent: true,  accentColor: 'var(--warning)' },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'var(--bg-surface-1)',
            padding: '1.25rem 1.5rem',
          }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.accent ? (k as any).accentColor : undefined }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid: modules 2-col + alerts sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Module cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {MODULES.map((mod, i) => (
            <Link
              key={mod.href}
              href={mod.href}
              style={{
                display: 'block',
                background: 'var(--bg-surface-1)',
                padding: '1.5rem',
                textDecoration: 'none',
                transition: 'background var(--t-fast)',
                /* Last item spans if odd count */
                ...(i === MODULES.length - 1 && MODULES.length % 2 !== 0
                  ? { gridColumn: '1 / -1' }
                  : {}),
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-2)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-1)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {mod.label}
                </span>
                <StatusBadge status={mod.status} />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: mod.kpiColor ?? 'var(--text-primary)',
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {mod.kpi}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  {mod.kpiUnit}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mod.description}</p>
                {mod.delta && (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{mod.delta}</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Alert feed */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Recent Alerts</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 5px var(--danger)', display: 'inline-block' }} />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Live</span>
            </span>
          </div>
          <div>
            {ALERTS.map(a => <AlertRow key={a.id} alert={a} />)}
          </div>
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

      {/* Zero-state prompt for new tenants */}
      {activeAgents === 0 && certificates === 0 && (
        <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Your governance environment is ready</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Register your first AI agent to start generating provenance certificates and firewall evaluations.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login?mode=signup" style={{
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              color: '#fff', fontSize: '1rem', fontWeight: 600,
              padding: '16px 32px', borderRadius: '12px',
              transition: 'opacity 0.2s, transform 0.1s',
              display: 'inline-block',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >Create free account →</Link>
            <Link href="/documentation" style={{
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)',
              fontSize: '1rem', fontWeight: 500,
              padding: '16px 32px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'inline-block',
            }}>Read the docs</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px', marginBottom: '48px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔒</span> TrustLayer
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Runtime governance for AI agent fleets.
              </p>
            </div>
            {[
              { heading: 'Product', links: ['AI Action Firewall', 'Corporate SOUL', 'FinOps Control', 'Red Teaming', 'A2A Gateway'] },
              { heading: 'Solutions', links: ['Financial Services', 'Healthcare AI', 'Insurance', 'Government', 'Industrial'] },
              { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'DPA', 'SLA', 'Security'] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                  {col.heading}
                </div>
                {col.links.map(link => (
                  <div key={link} style={{ marginBottom: '10px' }}>
                    <Link href="/login" style={{
                      textDecoration: 'none', fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.5)',
                      transition: 'color 0.2s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                    >{link}</Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '24px', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>
              © 2026 TrustLayer. All rights reserved.
            </span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>
              EU AI Act ready · GDPR compliant · SOC 2 in progress
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

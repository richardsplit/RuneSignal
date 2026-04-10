'use client';

import React, { useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────── */
type EventSeverity = 'critical' | 'warning' | 'info' | 'success';
type EventCategory = 'exception' | 'policy' | 'identity' | 'provenance' | 'conflict' | 'insurance' | 'system';

interface AuditEvent {
  id: string;
  ts: string;
  date: string;
  severity: EventSeverity;
  category: EventCategory;
  actor: string;
  actorType: 'agent' | 'human' | 'system';
  title: string;
  detail: string;
  ref?: string;
}

/* ─── Static data (newest first) ────────────────────────────────────── */
const EVENTS: AuditEvent[] = [
  {
    id: 'evt-0091', ts: '09:14:32', date: 'Today',
    severity: 'critical', category: 'exception', actorType: 'agent', actor: 'FinanceBot',
    title: 'Exception raised — unrecognized wire transfer schema',
    detail: 'Agent attempted to invoke payment API with an unregistered schema. Routed to human reviewer.',
    ref: 'exc-5091',
  },
  {
    id: 'evt-0090', ts: '09:03:11', date: 'Today',
    severity: 'warning', category: 'conflict', actorType: 'agent', actor: 'SDR_Bot',
    title: 'Intent collision queued — billing address update',
    detail: 'Semantic similarity 0.94 against concurrent FinanceBot intent. Mediation pending.',
    ref: 'int-992',
  },
  {
    id: 'evt-0089', ts: '08:41:05', date: 'Today',
    severity: 'warning', category: 'provenance', actorType: 'system', actor: 'Provenance Engine',
    title: 'Model version anomaly detected — gpt-4o-mini',
    detail: 'Certificate for CodeCopilot output references model version not on approved list.',
    ref: '7b2e-9d1a',
  },
  {
    id: 'evt-0088', ts: '08:30:00', date: 'Today',
    severity: 'info', category: 'identity', actorType: 'human', actor: 'M. Chen',
    title: 'Agent suspended — SlackBot_Dev',
    detail: '12 policy violations triggered automatic suspension. Manual review confirmed by M. Chen.',
    ref: 'agt-003',
  },
  {
    id: 'evt-0087', ts: '07:55:14', date: 'Today',
    severity: 'success', category: 'exception', actorType: 'human', actor: 'R. Shah',
    title: 'Exception approved — bulk close tickets',
    detail: 'SupportAgent request to bulk-close 47 tickets approved within SLA window.',
    ref: 'exc-5031',
  },
  {
    id: 'evt-0086', ts: '22:12:44', date: 'Yesterday',
    severity: 'critical', category: 'exception', actorType: 'human', actor: 'M. Chen',
    title: 'Exception rejected — push to protected branch',
    detail: 'CodeCopilot request to push directly to main was rejected. CI/CD policy violation logged.',
    ref: 'exc-5040',
  },
  {
    id: 'evt-0085', ts: '18:00:00', date: 'Yesterday',
    severity: 'info', category: 'policy', actorType: 'human', actor: 'Admin',
    title: 'Policy created — DataResidency',
    detail: 'New conflict policy DataResidency added to arbiter. Queues exports to non-approved destinations.',
    ref: 'pol-003',
  },
  {
    id: 'evt-0084', ts: '14:33:07', date: 'Yesterday',
    severity: 'info', category: 'identity', actorType: 'human', actor: 'Admin',
    title: 'Agent registered — DataPipeline (agt-005)',
    detail: 'New agent provisioned. Awaiting scope assignment before activation.',
    ref: 'agt-005',
  },
  {
    id: 'evt-0083', ts: '11:22:30', date: 'Yesterday',
    severity: 'warning', category: 'insurance', actorType: 'system', actor: 'Risk Engine',
    title: 'Risk score escalated — SlackBot_Dev (55 → 95)',
    detail: 'Actuarial model recalculated following 8 new violations. Premium adjusted to $1,500/mo.',
    ref: 'agt-003',
  },
  {
    id: 'evt-0082', ts: '09:01:00', date: 'Yesterday',
    severity: 'info', category: 'system', actorType: 'system', actor: 'TrustLayer',
    title: 'Scheduled risk recalculation completed',
    detail: 'Fleet-wide actuarial snapshot complete. 4 agents evaluated. No critical escalations.',
    ref: undefined,
  },
];

/* ─── Severity config ────────────────────────────────────────────────── */
const SEV_CONFIG: Record<EventSeverity, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: 'var(--danger)',  bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  label: 'Critical' },
  warning:  { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', label: 'Warning'  },
  info:     { color: 'var(--info)',    bg: 'var(--info-bg)',    border: 'var(--info-border)',    label: 'Info'     },
  success:  { color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)', label: 'Success'  },
};

const CAT_LABELS: Record<EventCategory, string> = {
  exception:  'Exception',
  policy:     'Policy',
  identity:   'Identity',
  provenance: 'Provenance',
  conflict:   'Conflict',
  insurance:  'Insurance',
  system:     'System',
};

const ACTOR_TYPE_COLOR: Record<AuditEvent['actorType'], string> = {
  agent:  'var(--info)',
  human:  'var(--accent)',
  system: 'var(--text-muted)',
};

/* ─── Sub-components ─────────────────────────────────────────────────── */
function TimelineDot({ severity, glow }: { severity: EventSeverity; glow?: boolean }) {
  const { color } = SEV_CONFIG[severity];
  return (
    <div style={{
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      marginTop: '4px',
      boxShadow: glow ? `0 0 6px ${color}` : undefined,
      position: 'relative',
      zIndex: 1,
    }} />
  );
}

function ActorChip({ actor, type }: { actor: string; type: AuditEvent['actorType'] }) {
  const color = ACTOR_TYPE_COLOR[type];
  const bgMap: Record<AuditEvent['actorType'], string> = {
    agent:  'var(--info-bg)',
    human:  'var(--accent-dim)',
    system: 'rgba(255,255,255,0.03)',
  };
  const borderMap: Record<AuditEvent['actorType'], string> = {
    agent:  'var(--info-border)',
    human:  'var(--accent-border)',
    system: 'var(--border-subtle)',
  };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      fontSize: '0.6875rem',
      fontWeight: 600,
      color,
      background: bgMap[type],
      border: `1px solid ${borderMap[type]}`,
      borderRadius: '4px',
      padding: '0.125rem 0.375rem',
    }}>
      {actor}
    </span>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function AuditPage() {
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');

  const filtered = EVENTS.filter(e => {
    if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    return true;
  });

  /* Group by date */
  const grouped = filtered.reduce<Record<string, AuditEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

  const categories = Array.from(new Set(EVENTS.map(e => e.category))) as EventCategory[];

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-description">Immutable governance event log across all platform modules.</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => alert('Export as CSV — coming soon')}
        >
          Export Log
        </button>
      </div>

      {/* KPI strip */}
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
          { label: 'Total Events (30d)', value: EVENTS.length, color: undefined },
          { label: 'Critical',  value: EVENTS.filter(e => e.severity === 'critical').length, color: 'var(--danger)'  },
          { label: 'Warnings',  value: EVENTS.filter(e => e.severity === 'warning').length,  color: 'var(--warning)' },
          { label: 'Human Actions', value: EVENTS.filter(e => e.actorType === 'human').length, color: 'var(--accent)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-surface-1)', padding: '1.25rem 1.5rem' }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Severity</span>
        {(['all', 'critical', 'warning', 'info', 'success'] as const).map(s => {
          const active = severityFilter === s;
          const color = s !== 'all' ? SEV_CONFIG[s].color : 'var(--text-secondary)';
          return (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              style={{
                padding: '0.3rem 0.625rem',
                borderRadius: '5px',
                border: '1px solid',
                borderColor: active ? (s !== 'all' ? SEV_CONFIG[s].border : 'var(--border-strong)') : 'transparent',
                background: active ? (s !== 'all' ? SEV_CONFIG[s].bg : 'rgba(255,255,255,0.04)') : 'transparent',
                color: active ? color : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {s === 'all' ? 'All' : SEV_CONFIG[s].label}
            </button>
          );
        })}

        <div style={{ width: '1px', height: '16px', background: 'var(--border-default)' }} />

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Module</span>
        {(['all', ...categories] as const).map(c => {
          const active = categoryFilter === c;
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(c as typeof categoryFilter)}
              style={{
                padding: '0.3rem 0.625rem',
                borderRadius: '5px',
                border: '1px solid',
                borderColor: active ? 'var(--accent-border)' : 'transparent',
                background: active ? 'var(--accent-dim)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {c === 'all' ? 'All' : CAT_LABELS[c as EventCategory]}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {Object.entries(grouped).map(([date, events]) => (
        <div key={date} style={{ marginBottom: '2rem' }}>

          {/* Date label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {date}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          {/* Events */}
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute',
              left: '4px',
              top: '14px',
              bottom: '14px',
              width: '1px',
              background: 'var(--border-subtle)',
            }} />

            {events.map((event, idx) => {
              const sev = SEV_CONFIG[event.severity];
              return (
                <div
                  key={event.id}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    paddingLeft: '0',
                    marginBottom: idx < events.length - 1 ? '0' : '0',
                    position: 'relative',
                  }}
                >
                  {/* Dot + connector */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10px', flexShrink: 0, zIndex: 1 }}>
                    <TimelineDot severity={event.severity} glow={event.severity === 'critical'} />
                    {idx < events.length - 1 && <div style={{ flex: 1, width: '1px' }} />}
                  </div>

                  {/* Card */}
                  <div style={{
                    flex: 1,
                    background: 'var(--bg-surface-1)',
                    border: `1px solid ${event.severity === 'critical' ? sev.border : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem 1.25rem',
                    marginBottom: '0.75rem',
                    transition: 'border-color var(--t-base)',
                  }}>
                    {/* Card top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${event.severity === 'success' ? 'success' : event.severity === 'critical' ? 'danger' : event.severity === 'warning' ? 'warning' : 'info'}`}>
                          {sev.label}
                        </span>
                        <span className="badge badge-neutral" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, fontSize: '0.6875rem' }}>
                          {CAT_LABELS[event.category]}
                        </span>
                        <ActorChip actor={event.actor} type={event.actorType} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        {event.ref && (
                          <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{event.ref}</span>
                        )}
                        <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{event.ts}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem', lineHeight: 1.4 }}>
                      {event.title}
                    </p>

                    {/* Detail */}
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {event.detail}
                    </p>

                    {/* Event ID */}
                    <div style={{ marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono" style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{event.id}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Immutable · Ledger-verified</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
            No events match the current filters
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Adjust severity or module filters to see events.
          </p>
        </div>
      )}

    </div>
  );
}

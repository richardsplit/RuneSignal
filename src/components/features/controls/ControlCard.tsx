'use client';

import React from 'react';
import { Control, ControlStatus, ControlSeverity } from '@/lib/api';

/* ─── Maps ─────────────────────────────────────────────────────────────── */
export const STATUS_MAP: Record<ControlStatus, { label: string; color: string; chipClass: string }> = {
  passing:       { label: 'Passing',       color: 'var(--success)',       chipClass: 'chip chip-success' },
  failing:       { label: 'Failing',       color: 'var(--danger)',        chipClass: 'chip chip-danger'  },
  warning:       { label: 'Warning',       color: 'var(--warning)',       chipClass: 'chip chip-warning' },
  not_evaluated: { label: 'Not Evaluated', color: 'var(--text-tertiary)', chipClass: 'chip'              },
};

export const SEVERITY_MAP: Record<ControlSeverity, { label: string; cls: string }> = {
  low:      { label: 'Low',      cls: 'badge badge-success' },
  medium:   { label: 'Medium',   cls: 'badge badge-neutral' },
  high:     { label: 'High',     cls: 'badge'               },
  critical: { label: 'Critical', cls: 'badge badge-danger'  },
};

export const SEVERITY_HIGH_STYLE: React.CSSProperties = {
  background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning-border)',
};

export const EVAL_TYPE_LABEL: Record<string, string> = {
  real_time: 'Real-time',
  scheduled: 'Scheduled',
  manual:    'Manual',
};

export const REGULATION_LABELS: Record<string, string> = {
  eu_ai_act: 'EU AI Act',
  iso_42001: 'ISO 42001',
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */
export function relativeTime(iso?: string | null): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── StatusBadge ─────────────────────────────────────────────────────── */
export function StatusBadge({ status }: { status: ControlStatus }) {
  const { label, color, chipClass } = STATUS_MAP[status];
  return (
    <span className={chipClass} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6875rem' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
}

/* ─── ControlCard ─────────────────────────────────────────────────────── */
interface CardProps {
  control: Control;
  evaluating: boolean;
  onEvaluate: (id: string) => void;
  onOpenIncident: (control: Control) => void;
}

export function ControlCard({ control, evaluating, onEvaluate, onOpenIncident }: CardProps) {
  const { color } = STATUS_MAP[control.status];
  const { label: sevLabel, cls: sevCls } = SEVERITY_MAP[control.severity];
  const isFailing = control.status === 'failing';

  return (
    <div style={{ padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: `1px solid ${isFailing ? 'var(--danger-border)' : 'var(--border-default)'}`, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.125rem' }}>{control.name}</div>
          {control.description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{control.description}</div>
          )}
        </div>
        <StatusBadge status={control.status} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
        {control.regulation && (
          <span className="chip" style={{ fontSize: '0.6875rem', color: 'var(--accent)' }}>{REGULATION_LABELS[control.regulation] ?? control.regulation}</span>
        )}
        {control.clause_ref && <span className="chip" style={{ fontSize: '0.6875rem' }}>{control.clause_ref}</span>}
        <span className="chip" style={{ fontSize: '0.6875rem' }}>{EVAL_TYPE_LABEL[control.evaluation_type]}</span>
        <span className={sevCls} style={control.severity === 'high' ? SEVERITY_HIGH_STYLE : { fontSize: '0.6875rem' }}>{sevLabel}</span>
        {control.consecutive_failures > 0 && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--danger)', fontWeight: 600 }}>
            {control.consecutive_failures} consecutive fail{control.consecutive_failures > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.125rem' }}>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
          {control.owner && <span style={{ marginRight: '0.75rem' }}>👤 {control.owner}</span>}
          Last evaluated: {relativeTime(control.last_evaluated_at)}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {isFailing && (
            <button className="btn btn-danger" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={() => onOpenIncident(control)}>
              Open Incident
            </button>
          )}
          <button className="btn btn-ghost" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={() => onEvaluate(control.id)} disabled={evaluating}>
            {evaluating ? '…' : 'Evaluate Now'}
          </button>
        </div>
      </div>

      {isFailing && <div style={{ height: 2, background: 'linear-gradient(90deg, var(--danger), transparent)', borderRadius: 1, marginTop: '0.25rem' }} />}
    </div>
  );
}

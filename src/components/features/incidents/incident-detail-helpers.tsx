'use client';

import React from 'react';
import { IncidentStatus } from '@/lib/api';

export const STATUS_NEXT: Record<IncidentStatus, IncidentStatus | null> = {
  detected:      'investigating',
  investigating: 'mitigated',
  mitigated:     'reported',
  reported:      'closed',
  closed:        null,
};

export const STATUS_COLOR: Record<IncidentStatus, string> = {
  detected:      'var(--text-muted)',
  investigating: '#60a5fa',
  mitigated:     '#f59e0b',
  reported:      '#34d399',
  closed:        'var(--text-muted)',
};

export const SEVERITY_COLOR: Record<string, string> = {
  low:      'var(--success)',
  medium:   'var(--text-secondary)',
  high:     '#f59e0b',
  critical: '#ef4444',
};

export const TIMELINE_EVENT_LABELS: Record<string, { label: string; color: string }> = {
  created:             { label: 'Created',            color: 'var(--accent)' },
  status_changed:      { label: 'Status Changed',     color: '#60a5fa' },
  commander_assigned:  { label: 'Commander Assigned', color: '#a78bfa' },
  root_cause_updated:  { label: 'Root Cause Updated', color: '#f59e0b' },
  corrective_action:   { label: 'Action Added',       color: '#34d399' },
  art73_generated:     { label: 'Art.73 Report',      color: '#f87171' },
  comment:             { label: 'Comment',             color: 'var(--text-muted)' },
};

export const CATEGORY_LABELS: Record<string, string> = {
  operational:      'Operational',
  safety:           'Safety',
  rights_violation: 'Rights Violation',
  security:         'Security',
  compliance_gap:   'Compliance Gap',
};

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
      {children}
    </div>
  );
}

export function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 130, flexShrink: 0, paddingTop: '0.1rem' }}>{label}</span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{children}</span>
    </div>
  );
}

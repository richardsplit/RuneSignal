'use client';

import React from 'react';
import { AgentTimelineEvent } from '@/lib/api';

export const RISK_TIER_MAP: Record<string, { label: string; color: string }> = {
  prohibited:   { label: 'Prohibited',   color: '#ef4444' },
  high_risk:    { label: 'High Risk',    color: '#f59e0b' },
  limited_risk: { label: 'Limited Risk', color: '#60a5fa' },
  minimal_risk: { label: 'Minimal Risk', color: 'var(--success)' },
  unclassified: { label: 'Unclassified', color: 'var(--text-muted)' },
};

export const SOURCE_META: Record<AgentTimelineEvent['source'], { label: string; color: string; icon: string }> = {
  audit:    { label: 'Audit',    color: 'var(--accent)', icon: '📋' },
  firewall: { label: 'Firewall', color: '#ef4444',       icon: '🛡' },
  hitl:     { label: 'HITL',     color: '#a78bfa',       icon: '👤' },
  anomaly:  { label: 'Anomaly',  color: '#f59e0b',       icon: '⚠️' },
  incident: { label: 'Incident', color: '#f87171',       icon: '🚨' },
};

export const DATE_RANGES = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

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

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function eventTitle(event: AgentTimelineEvent): string {
  const e = event.event;
  if (event.source === 'audit')    return String(e.event_type ?? 'Audit event');
  if (event.source === 'firewall') return `Firewall — ${String(e.verdict ?? e.action ?? 'evaluation')}`;
  if (event.source === 'hitl')     return String(e.title ?? 'HITL review request');
  if (event.source === 'anomaly')  return `Anomaly: ${String(e.anomaly_type ?? e.type ?? 'detected')}`;
  if (event.source === 'incident') return String(e.title ?? 'Linked incident');
  return 'Event';
}

export function eventHref(event: AgentTimelineEvent): string | null {
  const id = event.event.id as string | undefined;
  if (!id) return null;
  if (event.source === 'incident') return `/incidents/${id}`;
  if (event.source === 'hitl')     return `/exceptions`;
  if (event.source === 'anomaly')  return `/anomaly`;
  return null;
}

export function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.75rem 1rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', flex: 1, minWidth: 80 }}>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: color ?? 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.25rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

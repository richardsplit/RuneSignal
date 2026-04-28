'use client';

import React from 'react';

interface ResolvedException {
  id: string;
  agent_id: string;
  priority: string;
  title: string;
  status: 'approved' | 'rejected' | string;
  resolution_reason: string;
  resolved_at: string;
}

interface ResolvedHistoryProps {
  resolved: ResolvedException[];
}

export default function ResolvedHistory({ resolved }: ResolvedHistoryProps) {
  if (resolved.length === 0) return null;

  return (
    <>
      <h3 className="t-h4" style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>Recently Resolved</h3>
      {resolved.map(r => (
        <div key={r.id} className="surface" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
              {r.title}
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 400, marginLeft: '0.5rem' }}>
                via Agent {r.agent_id.split('-')[0]}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              &ldquo;{r.resolution_reason}&rdquo;
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span className={r.status === 'approved' ? 'chip chip-success' : 'chip chip-danger'} style={{ display: 'block', marginBottom: '0.25rem' }}>
              {r.status.toUpperCase()}
            </span>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
              {new Date(r.resolved_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

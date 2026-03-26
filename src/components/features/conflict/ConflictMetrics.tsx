'use client';

import React from 'react';

interface ConflictMetricsProps {
  totalMediated: string;
  blockedConflicts: number;
  queuedConflicts: number;
}

export default function ConflictMetrics({ totalMediated, blockedConflicts, queuedConflicts }: ConflictMetricsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary-emerald)' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Mediated</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{totalMediated}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-error-rose)' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Blocked Conflicts</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{blockedConflicts}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-accent-amber)' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Queued (Collision)</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{queuedConflicts}</p>
      </div>
    </div>
  );
}

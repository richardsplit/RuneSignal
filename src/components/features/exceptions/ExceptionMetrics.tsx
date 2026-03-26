'use client';

import React from 'react';

interface ExceptionMetricsProps {
  openExceptions: number;
  slaBreaches: number;
  criticalPending: number;
  avgResolutionTime: string;
}

export default function ExceptionMetrics({ openExceptions, slaBreaches, criticalPending, avgResolutionTime }: ExceptionMetricsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Open Exceptions</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{openExceptions}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>SLA Breaches (24h)</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>{slaBreaches}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Critical Pending</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-error-rose)' }}>{criticalPending}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Avg Resolution Time</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-info-cyan)' }}>{avgResolutionTime}</p>
      </div>
    </div>
  );
}

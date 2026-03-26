'use client';

import React from 'react';

interface IdentityMetricsProps {
  totalAgents: number;
  activeAgents: number;
  suspendedAgents: number;
  violations: number;
}

export default function IdentityMetrics({ totalAgents, activeAgents, suspendedAgents, violations }: IdentityMetricsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Agents</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{totalAgents}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Active Now</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>{activeAgents}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Suspended</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-amber)' }}>{suspendedAgents}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Security Violations</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-error-rose)' }}>{violations}</p>
      </div>
    </div>
  );
}

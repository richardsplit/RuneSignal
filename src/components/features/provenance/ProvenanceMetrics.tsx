'use client';

import React from 'react';

interface ProvenanceMetricsProps {
  totalCerts: number;
  detectionRate: string;
  anomalies: number;
}

export default function ProvenanceMetrics({ totalCerts, detectionRate, anomalies }: ProvenanceMetricsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Certificates</h3>
        <p style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{totalCerts}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Detection Rate</h3>
        <p style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>{detectionRate}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Model Version Anomalies</h3>
        <p style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-accent-amber)' }}>{anomalies}</p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

interface InsuranceMetricsProps {
  totalLiabilities: string;
  fleetAvgRisk: number;
  monthlyPremium: string;
  activeClaims: number;
}

export default function InsuranceMetrics({ totalLiabilities, fleetAvgRisk, monthlyPremium, activeClaims }: InsuranceMetricsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Liabilities Insured</h3>
        <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalLiabilities}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Fleet Average Risk</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-info-cyan)' }}>{fleetAvgRisk}</p>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>/ 100</span>
        </div>
      </div>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Monthly Premium</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>{monthlyPremium}</p>
      </div>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Active Claims</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-amber)' }}>{activeClaims}</p>
      </div>
    </div>
  );
}

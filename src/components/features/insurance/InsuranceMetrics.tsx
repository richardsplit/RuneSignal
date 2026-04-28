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
    <div className="kpi-strip" style={{ marginBottom: '2rem' }}>
      <div className="kpi-card">
        <div className="kpi-label">Total Liabilities Insured</div>
        <div className="kpi-value">{totalLiabilities}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Fleet Average Risk</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <div className="kpi-value info">{fleetAvgRisk}</div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>/ 100</span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Monthly Premium</div>
        <div className="kpi-value success">{monthlyPremium}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Active Claims</div>
        <div className="kpi-value warning">{activeClaims}</div>
      </div>
    </div>
  );
}

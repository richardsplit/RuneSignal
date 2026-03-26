'use client';

import React from 'react';

interface RiskProfile {
  id: string;
  agent_id: string;
  risk_score: number;
  total_violations: number;
  hitl_escalations: number;
  model_version_anomalies: number;
  last_computed_at: string;
}

interface RiskProfilesTableProps {
  profiles: RiskProfile[];
  onRecalculate: (agentId?: string) => void;
  getRiskColor: (score: number) => string;
}

export default function RiskProfilesTable({ profiles, onRecalculate, getRiskColor }: RiskProfilesTableProps) {
  const calculatePremium = (score: number) => {
    const base = 500;
    let multiplier = 1.0;
    if (score > 10) multiplier = 1.2;
    if (score > 30) multiplier = 1.5;
    if (score > 60) multiplier = 2.0;
    if (score > 90) multiplier = 3.0;
    return (base * multiplier).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Agent Risk Profiles</h3>
        <button 
          className="btn btn-outline" 
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          onClick={() => onRecalculate()}
        >
          Recalculate All
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Agent ID</th>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Risk Score</th>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Violations</th>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>HITL / Anomaly</th>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem', textAlign: 'right' }}>Premium</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <td style={{ padding: '1rem', fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{p.agent_id.split('-')[0]}</td>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getRiskColor(p.risk_score) }} />
                  <span style={{ fontWeight: 600, color: getRiskColor(p.risk_score) }}>{p.risk_score}</span>
                </div>
              </td>
              <td style={{ padding: '1rem', color: p.total_violations > 0 ? 'var(--color-error-rose)' : 'var(--color-text-main)' }}>{p.total_violations}</td>
              <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{p.hitl_escalations} / {p.model_version_anomalies}</td>
              <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 500, textAlign: 'right' }}>{calculatePremium(p.risk_score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

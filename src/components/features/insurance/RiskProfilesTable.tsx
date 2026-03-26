'use client';

import React from 'react';

interface RiskProfile {
  id: string;
  agent: string;
  score: number;
  violations: number;
  hitl: number;
  anomalies: number;
  premium: string;
}

interface RiskProfilesTableProps {
  profiles: RiskProfile[];
  onRecalculate: () => void;
  getRiskColor: (score: number) => string;
}

export default function RiskProfilesTable({ profiles, onRecalculate, getRiskColor }: RiskProfilesTableProps) {
  return (
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Agent Risk Profiles</h3>
        <button 
          className="btn btn-outline" 
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          onClick={onRecalculate}
        >
          Recalculate All
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Agent</th>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Risk Score</th>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Violations</th>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>HITL / Anomaly</th>
            <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Dynamic Premium</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <td style={{ padding: '1rem', fontWeight: 500 }}>{p.agent}</td>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getRiskColor(p.score) }} />
                  <span style={{ fontWeight: 600, color: getRiskColor(p.score) }}>{p.score}</span>
                </div>
              </td>
              <td style={{ padding: '1rem', color: p.violations > 0 ? 'var(--color-error-rose)' : 'var(--color-text-main)' }}>{p.violations}</td>
              <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{p.hitl} / {p.anomalies}</td>
              <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 500 }}>{p.premium}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

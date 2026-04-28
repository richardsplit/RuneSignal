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
    <div className="surface" style={{ overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="t-h4">Agent Risk Profiles</h3>
        <button className="btn btn-outline btn-sm" onClick={() => onRecalculate()}>Recalculate All</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Agent ID</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Risk Score</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Violations</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>HITL / Anomaly</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)', textAlign: 'right' }}>Premium</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: 'var(--space-4) var(--space-6)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{p.agent_id.split('-')[0]}</td>
              <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getRiskColor(p.risk_score), flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: getRiskColor(p.risk_score) }}>{p.risk_score}</span>
                </div>
              </td>
              <td style={{ padding: 'var(--space-4) var(--space-6)', color: p.total_violations > 0 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: p.total_violations > 0 ? 600 : 400 }}>{p.total_violations}</td>
              <td style={{ padding: 'var(--space-4) var(--space-6)', color: 'var(--text-tertiary)' }}>{p.hitl_escalations} / {p.model_version_anomalies}</td>
              <td style={{ padding: 'var(--space-4) var(--space-6)', fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right' }}>{calculatePremium(p.risk_score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

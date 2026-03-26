'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ToastProvider';

export default function InsuranceDashboard() {
  const { showToast } = useToast();
  const [profiles] = useState([
    { id: 'agt-001', agent: 'InventoryManager', score: 0, violations: 0, hitl: 0, anomalies: 0, premium: '$500.00' },
    { id: 'agt-002', agent: 'ContractAnalyst', score: 25, violations: 2, hitl: 7, anomalies: 0, premium: '$600.00' },
    { id: 'agt-003', agent: 'SlackBot_Dev', score: 95, violations: 14, hitl: 2, anomalies: 1, premium: '$1,500.00' },
    { id: 'agt-004', agent: 'CustomerSupport', score: 45, violations: 4, hitl: 12, anomalies: 0, premium: '$750.00' },
  ]);

  const [claims] = useState([
    { id: 'clm-8921', agent: 'SlackBot_Dev', type: 'Data Exfiltration Violation', impact: '$12,500', status: 'investigating', date: '2 days ago' }
  ]);

  const getRiskColor = (score: number) => {
    if (score < 10) return 'var(--color-primary-emerald)';
    if (score < 50) return 'var(--color-info-cyan)';
    if (score < 80) return 'var(--color-accent-amber)';
    return 'var(--color-error-rose)';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Insurance Micro-OS</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Actuarial risk modeling, dynamic premiums, and liability coverage.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline"
            onClick={() => showToast('Opening Coverage Policy details (PDF)...')}
          >
            Coverage Policy
          </button>
          <button 
            className="btn btn-primary" 
            style={{ background: 'var(--color-info-cyan)', borderColor: 'var(--color-info-cyan)' }}
            onClick={() => showToast('Redirecting to Claims Filing Portal...', 'info')}
          >
            File Claim
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Liabilities Insured</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>$5,000,000</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Fleet Average Risk</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-info-cyan)' }}>42</p>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>/ 100</span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Monthly Premium</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>$3,350</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Active Claims</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-amber)' }}>1</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Risk Profiles Table */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Agent Risk Profiles</h3>
            <button 
              className="btn btn-outline" 
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              onClick={() => showToast('Triggering actuarial risk recalculation for entire fleet...')}
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

        {/* Claims Ledger */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Active Claims</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            {claims.map(claim => (
              <div key={claim.id} style={{ 
                padding: '1rem', 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--border-glass)', 
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-error-rose)' }}>{claim.agent}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{claim.date}</span>
                </div>
                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{claim.type}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{claim.impact}</span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: 'var(--color-accent-amber)',
                    textTransform: 'uppercase'
                  }}>
                    {claim.status}
                  </span>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>ID: {claim.id}</div>
              </div>
            ))}
            {claims.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>No active claims.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

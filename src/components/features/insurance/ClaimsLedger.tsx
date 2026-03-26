'use client';

import React from 'react';

interface Claim {
  id: string;
  agent_id: string;
  incident_type: string;
  financial_impact: number;
  status: 'filed' | 'investigating' | 'approved' | 'denied';
  filed_at: string;
}

interface ClaimsLedgerProps {
  claims: Claim[];
}

export default function ClaimsLedger({ claims }: ClaimsLedgerProps) {
  const formatImpact = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'var(--color-primary-emerald)';
      case 'denied': return 'var(--color-error-rose)';
      case 'investigating': return 'var(--color-accent-amber)';
      default: return 'var(--color-info-cyan)';
    }
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Active Claims</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {claims.map(claim => (
          <div key={claim.id} style={{ 
            padding: '1rem', 
            background: 'rgba(255,255,255,0.01)', 
            border: '1px solid var(--border-glass)', 
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-bright)' }}>Agent {claim.agent_id.split('-')[0]}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{new Date(claim.filed_at).toLocaleDateString()}</span>
            </div>
            <div style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>{claim.incident_type}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>{formatImpact(claim.financial_impact)}</span>
              <span style={{ 
                fontSize: '0.6rem', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '4px',
                background: `${getStatusColor(claim.status)}15`,
                color: getStatusColor(claim.status),
                border: `1px solid ${getStatusColor(claim.status)}40`,
                textTransform: 'uppercase',
                fontWeight: 600
              }}>
                {claim.status}
              </span>
            </div>
          </div>
        ))}
        {claims.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>No active claims.</p>
        )}
      </div>
    </div>
  );
}

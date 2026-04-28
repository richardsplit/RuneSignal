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

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'approved':     return 'chip chip-success';
      case 'denied':       return 'chip chip-danger';
      case 'investigating': return 'chip chip-warning';
      default:             return 'chip chip-accent';
    }
  };

  return (
    <div className="surface" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-default)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Active Claims</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {claims.map(claim => (
          <div key={claim.id} style={{ 
            padding: '1rem', 
            background: 'var(--surface-2)', 
            border: '1px solid var(--border-default)', 
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Agent {claim.agent_id.split('-')[0]}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{new Date(claim.filed_at).toLocaleDateString()}</span>
            </div>
            <div style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{claim.incident_type}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>{formatImpact(claim.financial_impact)}</span>
              <span className={getStatusChip(claim.status)} style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>
                {claim.status}
              </span>
            </div>
          </div>
        ))}
        {claims.length === 0 && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>No active claims.</p>
        )}
      </div>
    </div>
  );
}

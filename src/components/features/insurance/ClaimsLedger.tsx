'use client';

import React from 'react';

interface Claim {
  id: string;
  agent: string;
  type: string;
  impact: string;
  status: string;
  date: string;
}

interface ClaimsLedgerProps {
  claims: Claim[];
}

export default function ClaimsLedger({ claims }: ClaimsLedgerProps) {
  return (
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
  );
}

'use client';

import React from 'react';
import { useToast } from '@/components/ToastProvider';

export default function Header() {
  const { showToast } = useToast();
  
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: '1rem',
      borderBottom: '1px solid var(--border-glass)',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          className="btn btn-outline" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => showToast('Redirecting to TrustLayer Documentation...')}
        >
          <span>Documentation</span>
        </button>
        <button 
          className="btn btn-primary"
          onClick={() => showToast('Opening Agent Marketplace / Connection Wizard...')}
        >
          Connect New Agent
        </button>
        <div 
          onClick={() => showToast('User profile settings coming soon...', 'info')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary-emerald), var(--color-info-cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            color: 'white',
            cursor: 'pointer'
          }}
        >
          A
        </div>
      </div>
    </header>
  );
}

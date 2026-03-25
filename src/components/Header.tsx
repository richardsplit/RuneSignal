import React from 'react';

export default function Header() {
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
        <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Documentation</span>
        </button>
        <button className="btn btn-primary">
          Connect New Agent
        </button>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary-emerald), var(--color-info-cyan))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          color: 'white'
        }}>
          A
        </div>
      </div>
    </header>
  );
}

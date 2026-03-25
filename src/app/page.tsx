import React from 'react';

export default function Home() {
  return (
    <div>
      <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
        Platform Overview
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem' }}>
        Real-time visibility into your AI agent fleets.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* S3 Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>S3 Provenance</h3>
            <span style={{ background: 'var(--border-glass)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span>
          </div>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary-emerald)' }}>
            14,204
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Certificates generated today</p>
        </div>

        {/* S6 Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>S6 Identity</h3>
            <span style={{ background: 'var(--border-glass)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span>
          </div>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-info-cyan)' }}>
            42
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Registered Agents Active</p>
        </div>

        {/* S1 Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>S1 Conflict</h3>
            <span style={{ background: 'var(--border-glass)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
             <p style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-accent-amber)' }}>
               3
             </p>
             <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-error-rose)' }}>
               1 Blocked
             </p>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Conflicts detected past 24h</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

interface Intent {
  id: string;
  agent: string;
  intent: string;
  similarity: string;
  status: string;
  reason: string;
}

interface IntentFeedProps {
  intents: Intent[];
}

export default function IntentFeed({ intents }: IntentFeedProps) {
  return (
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-glass)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Real-time Intent Feed</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {intents.map(intent => (
          <div key={intent.id} style={{ 
            padding: '1rem', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '0.75rem',
            border: `1px solid ${intent.status === 'queue' ? 'rgba(245, 158, 11, 0.2)' : 'var(--border-glass)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-info-cyan)' }}>{intent.agent}</span>
              <span style={{ 
                fontSize: '0.75rem', 
                padding: '0.1rem 0.4rem', 
                borderRadius: '4px', 
                background: intent.status === 'allow' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: intent.status === 'allow' ? 'var(--color-primary-emerald)' : 'var(--color-accent-amber)'
              }}>
                {intent.status.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: '0.925rem', marginBottom: '0.5rem' }}>"{intent.intent}"</p>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Similarity: {intent.similarity}</span>
              <span>{intent.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

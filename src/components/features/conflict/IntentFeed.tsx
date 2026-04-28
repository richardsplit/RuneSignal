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
    <div className="surface" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-default)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Real-time Intent Feed</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {intents.map(intent => (
          <div key={intent.id} style={{ 
            padding: '1rem', 
            background: 'var(--surface-2)', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '0.75rem',
            border: `1px solid ${intent.status === 'queue' ? 'var(--warning-border)' : 'var(--border-default)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--info)' }}>{intent.agent}</span>
              <span style={{ 
                fontSize: '0.75rem', 
                padding: '0.1rem 0.4rem', 
                borderRadius: 'var(--radius-xs)', 
                background: intent.status === 'allow' ? 'var(--success-soft)' : 'var(--warning-soft)',
                color: intent.status === 'allow' ? 'var(--success)' : 'var(--warning)'
              }}>
                {intent.status.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: '0.925rem', marginBottom: '0.5rem' }}>"{intent.intent}"</p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Similarity: {intent.similarity}</span>
              <span>{intent.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';

export default function ConflictDashboard() {
  const [activeIntents] = useState([
    { id: 'int-992', agent: 'SDR_Bot', intent: 'Update billing address for Acme Corp', similarity: '0.94', status: 'queue', reason: 'Collision with FinanceBot intent' },
    { id: 'int-991', agent: 'SupportAgent', intent: 'Close ticket #4021', similarity: '0.12', status: 'allow', reason: 'No overlap detected' },
  ]);

  const [policies] = useState([
    { id: 'pol-001', name: 'FinancialGuard', description: 'Blocks any unauthorized wire transfer intents', category: 'Finance', action: 'block' },
    { id: 'pol-002', name: 'PII_Protector', description: 'Alerts if PII extraction is detected in intent', category: 'Privacy', action: 'alert' },
  ]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Agent Conflict Arbiter</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Semantic collision detection and real-time intent mediation.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline">Policy Config</button>
          <button className="btn btn-primary" style={{ background: 'var(--color-accent-amber)', borderColor: 'var(--color-accent-amber)' }}>Add Policy</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary-emerald)' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Mediated</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>1,842</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-error-rose)' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Blocked Conflicts</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>24</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-accent-amber)' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Queued (Collision)</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>7</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Intent Feed */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Real-time Intent Feed</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            {activeIntents.map(intent => (
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

        {/* Policy List */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Active Policies</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            {policies.map(policy => (
              <div key={policy.id} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{policy.name}</span>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-error-rose)' }}>{policy.action}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{policy.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

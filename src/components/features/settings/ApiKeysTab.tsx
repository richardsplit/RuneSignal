'use client';

import React from 'react';

interface ApiKey {
  id: string;
  key: string;
  name: string;
  created: string;
}

interface ApiKeysTabProps {
  apiKeys: ApiKey[];
  onGenerate: () => void;
  onRevoke: (id: string) => void;
}

export default function ApiKeysTab({ apiKeys, onGenerate, onRevoke }: ApiKeysTabProps) {
  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>Developer API Keys</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Use these keys to authenticate your AI agents with the TrustLayer SDK.</p>
      
      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        {apiKeys.map(k => (
          <div key={k.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary-emerald)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{k.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{k.key}</div>
              </div>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', color: 'var(--color-warning-amber)' }} onClick={() => onRevoke(k.id)}>Revoke</button>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Created on {k.created}</div>
          </div>
        ))}
        {apiKeys.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-md)' }}>
            No active API keys found.
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={onGenerate}>Generate New API Key</button>
    </div>
  );
}

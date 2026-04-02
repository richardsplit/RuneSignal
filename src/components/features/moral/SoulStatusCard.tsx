'use client';

import React from 'react';

interface SoulStatusCardProps {
  version: number | null;
  signedBy: string;
  createdAt: string;
  signatureValid: boolean;
  onConfigureClick: () => void;
}

export default function SoulStatusCard({ version, signedBy, createdAt, signatureValid, onConfigureClick }: SoulStatusCardProps) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Corporate SOUL Status</h2>
          {version ? (
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Version</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>v{version}</p>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Signed By</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>{signedBy}</p>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Last Updated</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>{new Date(createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Signature</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: signatureValid ? 'var(--color-primary-emerald)' : 'var(--color-error-rose)' }}>
                  {signatureValid ? '✓ Valid' : '✗ Tampered'}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-accent-amber)' }}>No Corporate SOUL configured. Set one up to enable moral governance.</p>
          )}
        </div>
        <button className="btn btn-primary" onClick={onConfigureClick}>
          {version ? 'Update SOUL' : 'Configure SOUL'}
        </button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

interface SecurityTabProps {
  mfaEnabled: boolean;
  onToggleMFA: () => void;
  onUpdatePassword: () => void;
}

export default function SecurityTab({ mfaEnabled, onToggleMFA, onUpdatePassword }: SecurityTabProps) {
  return (
    <div className="animate-fade-in">
      <h2 className="t-h3" style={{ marginBottom: 'var(--space-6)' }}>Security & MFA</h2>

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div className="surface" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.25rem' }}>Multi-Factor Authentication</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                Status:{' '}
                <span style={{ color: mfaEnabled ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                  {mfaEnabled ? 'Configured' : 'Not configured'}
                </span>
              </p>
            </div>
            <button
              className={mfaEnabled ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}
              onClick={onToggleMFA}
            >
              {mfaEnabled ? 'Disable MFA' : 'Configure MFA'}
            </button>
          </div>
        </div>

        <div className="surface" style={{ padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Change Password</h3>
          <div style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: '400px' }}>
            <input type="password" placeholder="Current password" className="form-input" />
            <input type="password" placeholder="New password" className="form-input" />
            <button className="btn btn-outline btn-sm" style={{ width: 'max-content' }} onClick={onUpdatePassword}>Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem', color: 'var(--color-text-main)' }}>Security & MFA</h2>
      
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Multi-Factor Authentication</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Status: <span style={{ color: mfaEnabled ? 'var(--color-primary-emerald)' : 'var(--color-warning-amber)', fontWeight: 600 }}>
                  {mfaEnabled ? 'Configured' : 'Not Configured'}
                </span>
              </p>
            </div>
            <button 
              className={mfaEnabled ? "btn btn-outline" : "btn btn-primary"}
              onClick={onToggleMFA}
            >
              {mfaEnabled ? 'Disable MFA' : 'Configure MFA'}
            </button>
          </div>
        </div>

        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Change Password</h3>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '400px' }}>
            <input type="password" placeholder="Current Password" className="form-input" style={{ width: '100%' }} />
            <input type="password" placeholder="New Password" className="form-input" style={{ width: '100%' }} />
            <button className="btn btn-outline" style={{ width: 'max-content' }} onClick={onUpdatePassword}>Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}

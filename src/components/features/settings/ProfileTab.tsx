'use client';

import React from 'react';

interface ProfileTabProps {
  profile: { fullName: string; email: string; role: string };
  setProfile: (profile: any) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function ProfileTab({ profile, setProfile, onSave, isSaving }: ProfileTabProps) {
  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem', color: 'var(--color-text-main)' }}>
        Profile Information
      </h2>
      
      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '500px' }}>
        <div>
          <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Full Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={profile.fullName} 
            onChange={(e) => setProfile({...profile, fullName: e.target.value})}
            style={{ width: '100%', padding: '0.75rem' }} 
          />
        </div>
        <div>
          <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email Address</label>
          <input type="email" className="form-input" defaultValue={profile.email} disabled style={{ width: '100%', opacity: 0.7, padding: '0.75rem' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Contact support to change your email address.</p>
        </div>
        <div>
          <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Role</label>
          <input type="text" className="form-input" defaultValue={profile.role} disabled style={{ width: '100%', opacity: 0.7, padding: '0.75rem' }} />
        </div>
        <button 
          className="btn btn-primary" 
          style={{ width: 'max-content', marginTop: '1rem' }}
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';

export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 1000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information' },
    { id: 'security', label: 'Security & MFA' },
    { id: 'apikeys', label: 'Developer API Keys' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <div style={{ padding: '0 2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Account Settings</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Manage your personal profile, security preferences, and API keys.</p>
        </div>
        {showToast && (
          <div className="animate-fade-in" style={{ 
            background: 'var(--color-primary-emerald)', 
            color: 'white', 
            padding: '0.75rem 1.5rem', 
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
          }}>
            Changes saved successfully!
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3fr', gap: '2rem', alignItems: 'start' }}>
        {/* Sidebar Tabs */}
        <div className="glass-panel" style={{ padding: '1rem', position: 'sticky', top: '2rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {tabs.map(tab => (
              <li key={tab.id}>
                <button 
                  onClick={() => setActiveTab(tab.id)}
                  style={{ 
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    color: activeTab === tab.id ? 'var(--color-primary-emerald)' : 'var(--color-text-muted)', 
                    background: activeTab === tab.id ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: `2px solid ${activeTab === tab.id ? 'var(--color-primary-emerald)' : 'transparent'}`
                  }}
                  className={activeTab !== tab.id ? "hover-highlight" : ""}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Tab Content */}
        <div className="glass-panel" style={{ padding: '2.5rem', minHeight: '400px' }}>
          {activeTab === 'profile' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                Profile Information
              </h2>
              
              <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '500px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Full Name</label>
                  <input type="text" className="form-input" defaultValue="Admin User" style={{ width: '100%', padding: '0.75rem' }} />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email Address</label>
                  <input type="email" className="form-input" defaultValue="admin@trustlayer.dev" disabled style={{ width: '100%', opacity: 0.7, padding: '0.75rem' }} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Contact support to change your email address.</p>
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Role</label>
                  <input type="text" className="form-input" defaultValue="Platform Superadmin" disabled style={{ width: '100%', opacity: 0.7, padding: '0.75rem' }} />
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'max-content', marginTop: '1rem' }}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem', color: 'var(--color-text-main)' }}>Security & MFA</h2>
              
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Multi-Factor Authentication</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Secure your account with an additional verification step.</p>
                    </div>
                    <button className="btn btn-primary">Enable MFA</button>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Change Password</h3>
                  <div style={{ display: 'grid', gap: '1rem', maxWidth: '400px' }}>
                    <input type="password" placeholder="Current Password" className="form-input" style={{ width: '100%' }} />
                    <input type="password" placeholder="New Password" className="form-input" style={{ width: '100%' }} />
                    <button className="btn btn-outline" style={{ width: 'max-content' }}>Update Password</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apikeys' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>Developer API Keys</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Use these keys to authenticate your AI agents with the TrustLayer SDK.</p>
              
              <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Production Key</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>tl_prod_************************af21</div>
                  </div>
                  <button className="btn btn-outline" style={{ fontSize: '0.75rem' }}>Revoke</button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Created on March 12, 2024</div>
              </div>

              <button className="btn btn-primary">Generate New API Key</button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem', color: 'var(--color-text-main)' }}>Notifications</h2>
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {[
                  { label: 'Security Alerts', desc: 'Critical alerts about agent violations and policy breaches.' },
                  { label: 'System Updates', desc: 'Notifications about platform maintenance and new features.' },
                  { label: 'Billing & Usage', desc: 'Monthly usage reports and billing statements.' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.desc}</div>
                    </div>
                    <div style={{ 
                      width: '40px', 
                      height: '20px', 
                      background: i === 2 ? 'rgba(255,255,255,0.1)' : 'var(--color-primary-emerald)', 
                      borderRadius: '10px',
                      position: 'relative',
                      cursor: 'pointer'
                    }}>
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        background: 'white', 
                        borderRadius: '50%', 
                        position: 'absolute', 
                        top: '2px', 
                        left: i === 2 ? '2px' : '22px',
                        transition: 'all 0.2s'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';

export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Changes saved successfully!');

  // State for all settings
  const [profile, setProfile] = useState({ fullName: 'Admin User', email: 'admin@trustlayer.dev', role: 'Platform Superadmin' });
  const [security, setSecurity] = useState({ mfaEnabled: false });
  const [apiKeys, setApiKeys] = useState<{ id: string; key: string; name: string; created: string }[]>([]);
  const [notifications, setNotifications] = useState([
    { id: 'security', label: 'Security Alerts', desc: 'Critical alerts about agent violations and policy breaches.', enabled: true },
    { id: 'system', label: 'System Updates', desc: 'Notifications about platform maintenance and new features.', enabled: true },
    { id: 'billing', label: 'Billing & Usage', desc: 'Monthly usage reports and billing statements.', enabled: false }
  ]);

  // Load from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('tl_settings_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));

    const savedSecurity = localStorage.getItem('tl_settings_security');
    if (savedSecurity) setSecurity(JSON.parse(savedSecurity));

    const savedKeys = localStorage.getItem('tl_settings_apikeys');
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    } else {
      const initialKeys = [{ id: 'k1', key: 'tl_prod_9k2j0f8s7d6f5g4h3j2k1l0m9n8b7v', name: 'Production Key', created: 'March 12, 2024' }];
      setApiKeys(initialKeys);
    }

    const savedNotifications = localStorage.getItem('tl_settings_notifications');
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
  }, []);

  // Persistence helpers
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleProfileSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('tl_settings_profile', JSON.stringify(profile));
      setIsSaving(false);
      triggerToast('Profile updated successfully!');
    }, 800);
  };

  const toggleMFA = () => {
    const newState = { mfaEnabled: !security.mfaEnabled };
    setSecurity(newState);
    localStorage.setItem('tl_settings_security', JSON.stringify(newState));
    triggerToast(`MFA ${newState.mfaEnabled ? 'enabled' : 'disabled'}`);
  };

  const generateAPIKey = () => {
    const newKey = {
      id: `k-${Math.random().toString(36).substring(2, 6)}`,
      key: `tl_prod_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      name: `Key ${apiKeys.length + 1}`,
      created: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    localStorage.setItem('tl_settings_apikeys', JSON.stringify(updated));
    triggerToast('New API key generated');
  };

  const revokeKey = (id: string) => {
    const updated = apiKeys.filter(k => k.id !== id);
    setApiKeys(updated);
    localStorage.setItem('tl_settings_apikeys', JSON.stringify(updated));
    triggerToast('API key revoked');
  };

  const toggleNotification = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n);
    setNotifications(updated);
    localStorage.setItem('tl_settings_notifications', JSON.stringify(updated));
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
            {toastMessage}
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
                  onClick={handleProfileSave}
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
                    <button 
                      className={security.mfaEnabled ? "btn btn-outline" : "btn btn-primary"}
                      onClick={toggleMFA}
                    >
                      {security.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
                    </button>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Change Password</h3>
                  <div style={{ display: 'grid', gap: '1rem', maxWidth: '400px' }}>
                    <input type="password" placeholder="Current Password" className="form-input" style={{ width: '100%' }} />
                    <input type="password" placeholder="New Password" className="form-input" style={{ width: '100%' }} />
                    <button className="btn btn-outline" style={{ width: 'max-content' }} onClick={() => triggerToast('Password update simulated')}>Update Password</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apikeys' && (
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
                      <button className="btn btn-outline" style={{ fontSize: '0.75rem', color: 'var(--color-warning-amber)' }} onClick={() => revokeKey(k.id)}>Revoke</button>
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

              <button className="btn btn-primary" onClick={generateAPIKey}>Generate New API Key</button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem', color: 'var(--color-text-main)' }}>Notifications</h2>
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {notifications.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.desc}</div>
                    </div>
                    <div 
                      onClick={() => toggleNotification(item.id)}
                      style={{ 
                        width: '40px', 
                        height: '20px', 
                        background: item.enabled ? 'var(--color-primary-emerald)' : 'rgba(255,255,255,0.1)', 
                        borderRadius: '10px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        background: 'white', 
                        borderRadius: '50%', 
                        position: 'absolute', 
                        top: '2px', 
                        left: item.enabled ? '22px' : '2px',
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

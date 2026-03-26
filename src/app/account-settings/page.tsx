'use client';

import React, { useState } from 'react';
import MFASetupModal from '@/components/features/security/MFASetupModal';
import ProfileTab from '@/components/features/settings/ProfileTab';
import SecurityTab from '@/components/features/settings/SecurityTab';
import ApiKeysTab from '@/components/features/settings/ApiKeysTab';
import NotificationsTab from '@/components/features/settings/NotificationsTab';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('Changes saved successfully!');

  // State for all settings
  const [profile, setProfile] = useLocalStorage('tl_settings_profile', { fullName: 'Admin User', email: 'admin@trustlayer.dev', role: 'Platform Superadmin' });
  const [security, setSecurity] = useLocalStorage('tl_settings_security', { mfaEnabled: false });
  const [apiKeys, setApiKeys] = useLocalStorage<any[]>('tl_settings_apikeys', [
    { id: 'k1', key: 'tl_prod_9k2j0f8s7d6f5g4h3j2k1l0m9n8b7v', name: 'Production Key', created: 'March 12, 2024' }
  ]);
  const [notifications, setNotifications] = useLocalStorage('tl_settings_notifications', [
    { id: 'security', label: 'Security Alerts', desc: 'Critical alerts about agent violations and policy breaches.', enabled: true },
    { id: 'system', label: 'System Updates', desc: 'Notifications about platform maintenance and new features.', enabled: true },
    { id: 'billing', label: 'Billing & Usage', desc: 'Monthly usage reports and billing statements.', enabled: false }
  ]);

  // UI helpers
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleProfileSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      triggerToast('Profile updated successfully!');
    }, 800);
  };

  const toggleMFA = () => {
    if (!security.mfaEnabled) {
      setShowMFAModal(true);
    } else {
      setSecurity({ mfaEnabled: false });
      triggerToast('MFA disabled');
    }
  };

  const handleMFASuccess = () => {
    setSecurity({ mfaEnabled: true });
    triggerToast('MFA enabled successfully!');
  };

  const generateAPIKey = () => {
    const newKey = {
      id: `k-${Math.random().toString(36).substring(2, 6)}`,
      key: `tl_prod_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      name: `Key ${apiKeys.length + 1}`,
      created: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
    setApiKeys([...apiKeys, newKey]);
    triggerToast('New API key generated');
  };

  const revokeKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
    triggerToast('API key revoked');
  };

  const toggleNotification = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
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
            <ProfileTab 
              profile={profile} 
              setProfile={setProfile} 
              onSave={handleProfileSave} 
              isSaving={isSaving} 
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab 
              mfaEnabled={security.mfaEnabled} 
              onToggleMFA={toggleMFA} 
              onUpdatePassword={() => triggerToast('Password update simulated')} 
            />
          )}

          {activeTab === 'apikeys' && (
            <ApiKeysTab 
              apiKeys={apiKeys} 
              onGenerate={generateAPIKey} 
              onRevoke={revokeKey} 
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab 
              notifications={notifications} 
              onToggle={toggleNotification} 
            />
          )}
        </div>
      </div>
      
      <MFASetupModal 
        isOpen={showMFAModal} 
        onClose={() => setShowMFAModal(false)} 
        onSuccess={handleMFASuccess} 
      />
    </div>
  );
}

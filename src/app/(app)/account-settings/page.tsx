'use client';

import React, { useState, useEffect } from 'react';
import MFASetupModal from '@/components/features/security/MFASetupModal';
import ProfileTab from '@/components/features/settings/ProfileTab';
import SecurityTab from '@/components/features/settings/SecurityTab';
import ApiKeysTab from '@/components/features/settings/ApiKeysTab';
import WebhooksTab from '@/components/features/settings/WebhooksTab';
import NotificationsTab from '@/components/features/settings/NotificationsTab';
import SovereignExportPanel from '@/components/features/settings/SovereignExportPanel';
import { createBrowserClient } from '@lib/db/supabase';

export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('Changes saved successfully!');
  const supabase = createBrowserClient();

  // State for properties that still need parent context
  const [profile, setProfile] = useState({ fullName: '', email: '', role: 'Member' });
  const [security, setSecurity] = useState({ mfaEnabled: false });
  const [notifications, setNotifications] = useState([
    { id: 'security', label: 'Security Alerts', desc: 'Critical alerts about agent violations and policy breaches.', enabled: true },
    { id: 'system', label: 'System Updates', desc: 'Notifications about platform maintenance and new features.', enabled: true },
    { id: 'billing', label: 'Billing & Usage', desc: 'Monthly usage reports and billing statements.', enabled: false }
  ]);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfile({
          fullName: user.user_metadata?.full_name || 'Generic User',
          email: user.email || '',
          role: user.app_metadata?.role || 'Member'
        });

        const { data: factors } = await supabase.auth.mfa.listFactors();
        const isMfaEnabled = factors?.all?.some(f => f.status === 'verified') || false;
        setSecurity({ mfaEnabled: isMfaEnabled });
      }
    };
    loadUserData();
  }, [supabase]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleProfileSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: profile.fullName }
    });
    
    if (error) {
      triggerToast(`Error: ${error.message}`);
    } else {
      triggerToast('Profile updated successfully!');
    }
    setIsSaving(false);
  };

  const toggleMFA = async () => {
    if (!security.mfaEnabled) {
      setShowMFAModal(true);
    } else {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.all?.find(f => f.factor_type === 'totp');
      
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
        if (error) {
          triggerToast(`Failed to disable MFA: ${error.message}`);
        } else {
          setSecurity({ mfaEnabled: false });
          triggerToast('MFA disabled');
        }
      }
    }
  };

  const handleMFASuccess = () => {
    setSecurity({ mfaEnabled: true });
    triggerToast('MFA enabled successfully!');
  };

  const toggleNotification = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
  };

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security & MFA' },
    { id: 'apikeys', label: 'Developer API Keys' },
    { id: 'webhooks', label: 'Governance Webhooks' },
    { id: 'sovereign', label: 'Sovereign Exports (S10)' },
    { id: 'notifications', label: 'Notification Settings' },
  ];

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Account &amp; Workspace</h1>
          <p className="page-description">Manage your personal profile, security preferences, and integration settings.</p>
        </div>
        {showToast && (
          <div className="callout callout-success animate-fade-in" style={{ padding: '0.625rem 1.25rem' }}>
            {toastMessage}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 3fr', gap: '1.5rem', alignItems: 'start' }}>
        <div className="surface" style={{ padding: '0.75rem', position: 'sticky', top: '2rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-sm)',
                    color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                    background: activeTab === tab.id ? 'var(--accent-dim)' : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                    fontSize: '0.875rem',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all var(--t-fast)',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface" style={{ padding: '2.5rem', minHeight: '400px' }}>
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
            <ApiKeysTab />
          )}

          {activeTab === 'webhooks' && (
            <WebhooksTab />
          )}

          {activeTab === 'sovereign' && (
            <SovereignExportPanel />
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

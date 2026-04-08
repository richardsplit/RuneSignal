'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';

interface SSOConfig {
  id: string;
  provider: 'okta' | 'entra' | 'auth0' | 'saml' | 'oidc';
  enforce_sso: boolean;
  is_active: boolean;
  config: Record<string, string>;
  created_at: string;
}

const PROVIDERS = [
  {
    id: 'okta',
    name: 'Okta',
    icon: '🔵',
    description: 'Connect with Okta Workforce Identity for SSO and SCIM provisioning.',
    fields: [
      { key: 'issuer', label: 'Okta Issuer URL', placeholder: 'https://yourorg.okta.com' },
      { key: 'client_id', label: 'Client ID', placeholder: 'Okta application Client ID' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'entra',
    name: 'Microsoft Entra ID',
    icon: '🟦',
    description: 'Connect with Azure Active Directory / Microsoft Entra for enterprise SSO.',
    fields: [
      { key: 'tenant_id', label: 'Azure Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'client_id', label: 'Application (Client) ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'auth0',
    name: 'Auth0',
    icon: '⚫',
    description: 'Connect with Auth0 Universal Login for flexible identity management.',
    fields: [
      { key: 'domain', label: 'Auth0 Domain', placeholder: 'yourorg.auth0.com' },
      { key: 'client_id', label: 'Client ID', placeholder: 'Auth0 application Client ID' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '••••••••', secret: true },
    ],
  },
];

export default function SSOSettingsPage() {
  const { tenantId } = useTenant();
  const [config, setConfig] = useState<SSOConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('okta');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [enforceSso, setEnforceSso] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    // Load existing SSO config
    fetch(`/api/v1/auth/sso/${selectedProvider}`, {
      headers: { 'X-Tenant-Id': tenantId },
    })
      .then(r => r.json())
      .then(d => {
        if (d.config) {
          setConfig(d.config);
          setEnforceSso(d.config.enforce_sso || false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId, selectedProvider]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/auth/sso/${selectedProvider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          ...formData,
          enforce_sso: enforceSso,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save SSO configuration');

      setConfig(data.config || data);
      setMessage({ type: 'success', text: 'SSO configuration saved successfully' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!tenantId) return;
    // Construct the SSO login URL for testing
    const loginUrl = `/api/v1/auth/sso/${selectedProvider}?tenant_id=${tenantId}`;
    window.open(loginUrl, '_blank', 'width=600,height=700');
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider)!;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#e5e5e5',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '32px',
        maxWidth: 800,
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Single Sign-On (SSO)</h1>
        <p style={{ color: '#737373', fontSize: 14, marginTop: 4 }}>
          Configure your identity provider to enable SSO for all team members
        </p>
      </div>

      {/* Current status banner */}
      {config?.is_active && (
        <div
          style={{
            background: '#052e16',
            border: '1px solid #14532d',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ color: '#10b981', fontWeight: 600, fontSize: 14 }}>
              ✓ SSO Active
            </span>
            <span style={{ color: '#737373', fontSize: 13, marginLeft: 12 }}>
              Provider: {config.provider.toUpperCase()}
              {config.enforce_sso && ' · Enforcement enabled'}
            </span>
          </div>
        </div>
      )}

      {/* Provider selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#737373', marginBottom: 10 }}>
          Identity Provider
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProvider(p.id);
                setFormData({});
                setConfig(null);
              }}
              style={{
                background: selectedProvider === p.id ? '#1a1a1a' : 'transparent',
                border: `1px solid ${selectedProvider === p.id ? '#10b981' : '#2a2a2a'}`,
                borderRadius: 8,
                padding: '10px 16px',
                cursor: 'pointer',
                color: selectedProvider === p.id ? '#e5e5e5' : '#737373',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{p.icon}</span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Provider description */}
      <div
        style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          {currentProvider.icon} {currentProvider.name}
        </div>
        <p style={{ fontSize: 13, color: '#737373', margin: 0 }}>
          {currentProvider.description}
        </p>
      </div>

      {/* Configuration form */}
      <div
        style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
          Configuration
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {currentProvider.fields.map(field => (
            <div key={field.key}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: '#737373',
                  marginBottom: 6,
                }}
              >
                {field.label}
              </label>
              <input
                type={field.secret ? 'password' : 'text'}
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={e =>
                  setFormData(prev => ({ ...prev, [field.key]: e.target.value }))
                }
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  color: '#e5e5e5',
                  padding: '10px 12px',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: field.secret ? 'monospace' : 'inherit',
                }}
              />
            </div>
          ))}
        </div>

        {/* Enforce SSO toggle */}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: '#0a0a0a',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Enforce SSO</div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>
              Require all users to log in via SSO. Password-based logins will be disabled.
            </div>
          </div>
          <div
            onClick={() => setEnforceSso(v => !v)}
            style={{
              width: 44,
              height: 24,
              background: enforceSso ? '#10b981' : '#2a2a2a',
              borderRadius: 12,
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 3,
                left: enforceSso ? 23 : 3,
                width: 18,
                height: 18,
                background: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
              }}
            />
          </div>
        </div>
      </div>

      {/* OIDC redirect URI info */}
      <div
        style={{
          background: '#0f1116',
          border: '1px solid #1e2433',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          fontSize: 12,
          color: '#737373',
        }}
      >
        <div style={{ fontWeight: 600, color: '#a3a3a3', marginBottom: 6 }}>
          Redirect URI (add to your IdP)
        </div>
        <code
          style={{
            color: '#10b981',
            fontFamily: 'monospace',
            fontSize: 13,
          }}
        >
          {typeof window !== 'undefined'
            ? `${window.location.origin}/api/v1/auth/sso/${selectedProvider}?callback=true`
            : `/api/v1/auth/sso/${selectedProvider}?callback=true`}
        </code>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            background: message.type === 'success' ? '#052e16' : '#1c0a0a',
            border: `1px solid ${message.type === 'success' ? '#14532d' : '#7f1d1d'}`,
            borderRadius: 8,
            padding: '12px 16px',
            color: message.type === 'success' ? '#10b981' : '#f87171',
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>

        {config?.is_active && (
          <button
            onClick={handleTestConnection}
            style={{
              background: 'transparent',
              color: '#10b981',
              border: '1px solid #10b981',
              borderRadius: 6,
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Test SSO Login
          </button>
        )}
      </div>
    </div>
  );
}

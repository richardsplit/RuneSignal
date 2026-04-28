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
    monogram: 'OK',
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
    monogram: 'MS',
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
    monogram: 'A0',
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
    const loginUrl = `/api/v1/auth/sso/${selectedProvider}?tenant_id=${tenantId}`;
    window.open(loginUrl, '_blank', 'width=600,height=700');
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider)!;

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Single Sign-On</h1>
        <p className="page-description">
          Connect an identity provider to enable SSO for all team members.
        </p>
      </div>

      {/* Active SSO callout */}
      {config?.is_active && (
        <div
          className="callout callout-success"
          style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>
            SSO Active — Provider: {config.provider.toUpperCase()}
          </span>
          {config.enforce_sso && (
            <span className="badge badge-success">Enforcement enabled</span>
          )}
        </div>
      )}

      {/* Provider selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: '0.625rem',
        }}>
          Identity Provider
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              className={`provider-card${selectedProvider === p.id ? ' selected' : ''}`}
              onClick={() => {
                setSelectedProvider(p.id);
                setFormData({});
                setConfig(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.625rem 0.875rem',
                background: selectedProvider === p.id ? 'var(--surface-2)' : 'var(--surface-1)',
                border: `1px solid ${selectedProvider === p.id ? 'var(--accent-border)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: selectedProvider === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                fontFamily: 'inherit',
                transition: 'border-color var(--t-base), background var(--t-base), color var(--t-base)',
              }}
            >
              {/* Monogram */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: 'var(--radius-sm)',
                background: selectedProvider === p.id ? 'var(--accent-soft)' : 'var(--hover-wash)',
                color: selectedProvider === p.id ? 'var(--accent)' : 'var(--text-tertiary)',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
                flexShrink: 0,
              }}>
                {p.monogram}
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Provider description panel */}
      <div className="surface" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title">{currentProvider.name}</span>
        </div>
        <div style={{ padding: '0.875rem 1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {currentProvider.description}
          </p>
        </div>
      </div>

      {/* Configuration form panel */}
      <div className="surface" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title">Configuration</span>
        </div>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentProvider.fields.map(field => (
            <div key={field.key} className="form-field">
              <label className="form-label" style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}>
                {field.label}
              </label>
              <input
                className="form-input"
                type={field.secret ? 'password' : 'text'}
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={e =>
                  setFormData(prev => ({ ...prev, [field.key]: e.target.value }))
                }
                style={{
                  width: '100%',
                  background: 'var(--canvas)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  padding: '0.5625rem 0.75rem',
                  fontSize: '0.8125rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: field.secret ? 'ui-monospace, monospace' : 'inherit',
                  transition: 'border-color var(--t-fast)',
                }}
              />
            </div>
          ))}

          {/* Enforce SSO toggle */}
          <div className="toggle-row" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            background: 'var(--canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginTop: '0.25rem',
          }}>
            <div>
              <div className="toggle-label" style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                Enforce SSO
              </div>
              <div className="toggle-description" style={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                marginTop: '0.125rem',
              }}>
                Require all users to log in via SSO. Password-based logins will be disabled.
              </div>
            </div>
            {/* Toggle switch */}
            <button
              role="switch"
              aria-checked={enforceSso}
              onClick={() => setEnforceSso(v => !v)}
              style={{
                width: 40,
                height: 22,
                background: enforceSso ? 'var(--accent)' : 'var(--surface-3)',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background var(--t-base)',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 3,
                left: enforceSso ? 21 : 3,
                width: 16,
                height: 16,
                background: '#fff',
                borderRadius: '50%',
                transition: 'left var(--t-base)',
                display: 'block',
              }} />
            </button>
          </div>
        </div>
      </div>

      {/* Redirect URI panel */}
      <div className="surface" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title">Redirect URI</span>
          <span className="t-caption">
            Add this to your identity provider
          </span>
        </div>
        <div style={{ padding: '1rem 1.25rem' }}>
          <code
            className="code-block t-mono"
            style={{
              display: 'block',
              background: 'var(--canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.625rem 0.875rem',
              fontSize: '0.8125rem',
              color: 'var(--accent)',
              wordBreak: 'break-all',
            }}
          >
            {typeof window !== 'undefined'
              ? `${window.location.origin}/api/v1/auth/sso/${selectedProvider}?callback=true`
              : `/api/v1/auth/sso/${selectedProvider}?callback=true`}
          </code>
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`callout ${message.type === 'success' ? 'callout-success' : 'callout-danger'}`}
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: message.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
            border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.8125rem',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>

        {config?.is_active && (
          <button
            className="btn btn-outline"
            onClick={handleTestConnection}
          >
            Test SSO Login
          </button>
        )}
      </div>
    </div>
  );
}

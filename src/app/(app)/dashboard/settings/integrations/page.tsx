'use client';

import React, { useState } from 'react';

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'coming_soon';
  icon: string;
  fields?: { key: string; label: string; type: string; placeholder?: string }[];
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: 'servicenow',
    name: 'ServiceNow',
    description: 'Route HITL approvals to ServiceNow Incidents or Change Requests.',
    status: 'disconnected',
    icon: '🔔',
    fields: [
      { key: 'instance_url', label: 'Instance URL', type: 'url', placeholder: 'https://mycompany.service-now.com' },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'table', label: 'Table (optional)', type: 'text', placeholder: 'incident' },
    ],
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Create Jira issues for HITL reviews with ai-governance labels.',
    status: 'disconnected',
    icon: '📋',
    fields: [
      { key: 'base_url', label: 'Jira URL', type: 'url', placeholder: 'https://mycompany.atlassian.net' },
      { key: 'user_email', label: 'Email', type: 'email' },
      { key: 'api_token', label: 'API Token', type: 'password' },
      { key: 'project_key', label: 'Project Key', type: 'text', placeholder: 'TL' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send HITL approval requests to a Slack channel with one-click approve/reject.',
    status: 'disconnected',
    icon: '💬',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
      { key: 'channel_id', label: 'Channel ID', type: 'text', placeholder: 'C01234567' },
    ],
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    description: 'Escalate critical HITL approvals to on-call engineers.',
    status: 'coming_soon',
    icon: '🚨',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Send HITL approval requests as adaptive cards in Teams channels.',
    status: 'coming_soon',
    icon: '🟦',
  },
];

function IntegrationCardComponent({ integration }: { integration: IntegrationCard }) {
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: integration.id, config }),
      });
      if (res.ok) {
        setTestResult({ success: true, message: 'Integration saved successfully.' });
        setExpanded(false);
      } else {
        setTestResult({ success: false, message: 'Failed to save integration.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: integration.id, config, test_only: true }),
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.message || (data.success ? 'Connected' : 'Failed') });
    } finally {
      setSaving(false);
    }
  };

  const statusColor = integration.status === 'connected' ? '#22c55e' : integration.status === 'coming_soon' ? '#6b7280' : '#f59e0b';
  const statusLabel = integration.status === 'connected' ? 'Connected' : integration.status === 'coming_soon' ? 'Coming Soon' : 'Not Connected';

  return (
    <div style={{
      border: '1px solid var(--border-default)',
      borderRadius: '10px',
      overflow: 'hidden',
      background: 'var(--bg-surface-1)',
    }}>
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>{integration.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{integration.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '320px' }}>{integration.description}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.625rem',
            padding: '2px 8px',
            borderRadius: '4px',
            background: `${statusColor}22`,
            color: statusColor,
            border: `1px solid ${statusColor}44`,
            fontWeight: 600,
          }}>
            {statusLabel}
          </span>
          {integration.status !== 'coming_soon' && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              {integration.status === 'connected' ? 'Configure' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {expanded && integration.fields && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px', background: 'var(--bg-surface-2)' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {integration.fields.map(field => (
              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={config[field.key] || ''}
                  onChange={e => setConfig(c => ({ ...c, [field.key]: e.target.value }))}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-surface-1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>
            ))}
            {testResult && (
              <div style={{
                fontSize: '0.75rem',
                padding: '8px',
                borderRadius: '6px',
                background: testResult.success ? '#22c55e11' : '#ef444411',
                color: testResult.success ? '#22c55e' : '#ef4444',
              }}>
                {testResult.success ? '✓ ' : '✗ '}{testResult.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleTest}
                disabled={saving}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8125rem' }}
              >
                Test Connection
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '7px 14px', borderRadius: '6px', background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsSettingsPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '760px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Integrations
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Route HITL approvals and compliance events to your existing workflow tools.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {INTEGRATIONS.map(integration => (
          <IntegrationCardComponent key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}

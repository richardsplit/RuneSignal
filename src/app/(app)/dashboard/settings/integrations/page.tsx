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

  const statusCls = integration.status === 'connected' ? 'badge-success' : integration.status === 'coming_soon' ? 'badge-neutral' : 'badge-warning';
  const statusLabel = integration.status === 'connected' ? 'Connected' : integration.status === 'coming_soon' ? 'Coming Soon' : 'Not Connected';

  return (
    <div className="surface" style={{ overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: '1.5rem' }}>{integration.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{integration.name}</div>
            <div className="t-caption" style={{ marginTop: '2px', maxWidth: '320px' }}>{integration.description}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`badge ${statusCls}`}>{statusLabel}</span>
          {integration.status !== 'coming_soon' && (
            <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => setExpanded(!expanded)}>
              {integration.status === 'connected' ? 'Configure' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {expanded && integration.fields && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '1rem', background: 'var(--surface-2)' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {integration.fields.map(field => (
              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="form-label">{field.label}</label>
                <input
                  className="form-input"
                  type={field.type}
                  placeholder={field.placeholder}
                  value={config[field.key] || ''}
                  onChange={e => setConfig(c => ({ ...c, [field.key]: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
            {testResult && (
              <div className={`callout ${testResult.success ? 'callout-success' : 'callout-danger'}`} style={{ padding: '0.375rem 0.75rem' }}>
                {testResult.success ? '✓ ' : '✗ '}{testResult.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <button className="btn btn-outline" type="button" onClick={handleTest} disabled={saving}>Test Connection</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsSettingsPage() {
  return (
    <div style={{ maxWidth: '760px' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="page-title">Integrations</h1>
        <p className="page-description">Route HITL approvals and compliance events to your existing workflow tools.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {INTEGRATIONS.map(integration => (
          <IntegrationCardComponent key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}

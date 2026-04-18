'use client';

import React, { useEffect, useState } from 'react';

interface IntegrationChannel {
  id: string;
  provider: 'slack' | 'teams' | 'jira' | 'servicenow' | 'webhook';
  is_active: boolean;
  config: Record<string, unknown>;
  updated_at: string;
}

const PROVIDER_INFO = {
  slack: {
    name: 'Slack',
    description: 'Send interactive HITL approval requests to a Slack channel. Reviewers approve/reject directly from Slack.',
    icon: '💬',
    docsUrl: 'https://api.slack.com/apps',
    fields: [] as string[],
  },
  teams: {
    name: 'Microsoft Teams',
    description: 'Post Adaptive Cards to a Teams channel for HITL approval workflows.',
    icon: '🟦',
    docsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
    fields: ['webhook_url', 'channel_name'],
  },
  jira: {
    name: 'Jira',
    description: 'Create Jira issues for HITL tickets. Resolve tickets when issues are completed.',
    icon: '🔵',
    docsUrl: 'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/',
    fields: ['base_url', 'user_email', 'api_token', 'project_key', 'issue_type'],
  },
  servicenow: {
    name: 'ServiceNow',
    description: 'Create ServiceNow incidents for HITL tickets. Sync resolution status bidirectionally.',
    icon: '🔧',
    docsUrl: 'https://developer.servicenow.com',
    fields: ['instance_url', 'username', 'password', 'table', 'category'],
  },
  webhook: {
    name: 'Custom Webhook',
    description: 'Send signed HTTP POST requests to any endpoint when HITL tickets are created or resolved.',
    icon: '🔗',
    docsUrl: '#',
    fields: ['url', 'secret'],
  },
};

export default function IntegrationsPage() {
  const [channels, setChannels] = useState<IntegrationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    try {
      const res = await fetch('/api/v1/integrations');
      if (res.ok) setChannels(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function getChannel(provider: string) {
    return channels.find(c => c.provider === provider);
  }

  function startConfigure(provider: string) {
    setConfiguring(provider);
    setFormData({});
    setMessage(null);
  }

  async function saveConfig(provider: string) {
    setSaving(true);
    setMessage(null);
    try {
      let endpoint = '';
      switch (provider) {
        case 'teams': endpoint = '/api/v1/integrations/teams/install'; break;
        case 'jira': endpoint = '/api/v1/integrations/jira/install'; break;
        case 'servicenow': endpoint = '/api/v1/integrations/servicenow/install'; break;
        case 'webhook': endpoint = '/api/v1/integrations/webhook/install'; break;
        default: return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `${PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO]?.name} connected successfully!` });
        setConfiguring(null);
        fetchChannels();
      } else {
        setMessage({ type: 'error', text: data.error || 'Configuration failed' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function disconnect(provider: string) {
    let endpoint = '';
    switch (provider) {
      case 'teams': endpoint = '/api/v1/integrations/teams/install'; break;
      case 'jira': endpoint = '/api/v1/integrations/jira/install'; break;
      case 'servicenow': endpoint = '/api/v1/integrations/servicenow/install'; break;
      default: return;
    }

    await fetch(endpoint, { method: 'DELETE' });
    fetchChannels();
  }

  const providers = Object.keys(PROVIDER_INFO) as Array<keyof typeof PROVIDER_INFO>;

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Integrations</h1>
        <p className="page-description">
          Connect RuneSignal to your existing tools. HITL approval requests will be routed through active channels automatically.
        </p>
      </div>

      {message && (
        <div className={`callout ${message.type === 'success' ? 'callout-success' : 'callout-danger'}`} style={{ marginBottom: '1.25rem' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {providers.map(provider => {
          const info = PROVIDER_INFO[provider];
          const channel = getChannel(provider);
          const isConnected = channel?.is_active === true;
          const isConfiguring = configuring === provider;

          return (
            <div key={provider} className="surface" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{info.icon}</span>
                    <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{info.name}</h3>
                    {isConnected && <span className="badge badge-success">Connected</span>}
                  </div>
                  <p className="t-body-sm text-secondary" style={{ lineHeight: 1.5 }}>{info.description}</p>
                  {isConnected && channel && (
                    <p className="t-caption" style={{ marginTop: '0.5rem' }}>
                      Last updated: {new Date(channel.updated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {isConnected ? (
                    <>
                      <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => startConfigure(provider)}>Reconfigure</button>
                      {provider !== 'slack' && (
                        <button className="btn btn-danger" style={{ fontSize: '0.8rem' }} onClick={() => disconnect(provider)}>Disconnect</button>
                      )}
                    </>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem' }}
                      onClick={async () => {
                        if (provider === 'slack') {
                          try {
                            const res = await fetch('/api/v1/integrations/slack/install');
                            if (res.redirected) {
                              window.location.href = res.url;
                            } else if (res.ok) {
                              const data = await res.json();
                              if (data.url) window.location.href = data.url;
                              else setMessage({ type: 'success', text: 'Slack OAuth initiated.' });
                            } else {
                              const data = await res.json().catch(() => ({}));
                              setMessage({ type: 'error', text: data.error || 'Slack connection requires an active session. Please sign in first.' });
                            }
                          } catch {
                            setMessage({ type: 'error', text: 'Unable to reach the Slack OAuth endpoint. Ensure you are signed in.' });
                          }
                        } else {
                          startConfigure(provider);
                        }
                      }}
                    >
                      {provider === 'slack' ? 'Connect with Slack' : 'Configure'}
                    </button>
                  )}
                </div>
              </div>

              {/* Config form */}
              {isConfiguring && info.fields.length > 0 && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                    {info.fields.map(field => (
                      <div key={field}>
                        <label className="form-label" style={{ textTransform: 'capitalize' }}>{field.replace(/_/g, ' ')}</label>
                        <input
                          className="form-input"
                          type={field.includes('token') || field.includes('secret') || field.includes('password') ? 'password' : 'text'}
                          value={formData[field] || ''}
                          onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                          placeholder={field}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={() => saveConfig(provider)} disabled={saving}>
                      {saving ? 'Saving…' : 'Save & Connect'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setConfiguring(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

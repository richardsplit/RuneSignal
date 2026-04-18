'use client';

import { useState, useEffect } from 'react';

interface Plugin {
  id: string;
  name: string;
  description: string;
  plugin_type: string;
  category: string;
  icon?: string;
  triggers: string[];
  is_active: boolean;
  total_fires: number;
  total_errors: number;
  last_fired_at?: string;
  endpoint_url: string;
  retry_count: number;
  timeout_ms: number;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  plugin_type: string;
  category: string;
  icon?: string;
  triggers: string[];
  retry_count: number;
  timeout_ms: number;
}

const CATEGORY_BADGE: Record<string, string> = {
  alerting:      'badge badge-danger',
  observability: 'badge badge-accent',
  ticketing:     'badge badge-info',
  crm:           'badge badge-success',
  regulatory:    'badge badge-warning',
  custom:        'badge badge-neutral',
};

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installed' | 'catalog'>('installed');
  const [installModal, setInstallModal] = useState<Template | null>(null);
  const [endpointUrl, setEndpointUrl] = useState('');
  const [authHeader, setAuthHeader] = useState('');
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState('');

  const tenantId = typeof window !== 'undefined'
    ? document.cookie.match(/tenant_id=([^;]+)/)?.[1] || 'demo-tenant'
    : 'demo-tenant';

  useEffect(() => {
    fetchPlugins();
  }, []);

  async function fetchPlugins() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/plugins?include_templates=true', {
        headers: { 'X-Tenant-Id': tenantId },
      });
      const json = await res.json();
      setPlugins(json.plugins || []);
      setTemplates(json.templates || []);
    } catch {
      setError('Failed to load plugins');
    } finally {
      setLoading(false);
    }
  }

  async function installPlugin() {
    if (!installModal || !endpointUrl) return;
    setInstalling(true);
    try {
      const res = await fetch('/api/v1/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({
          name: installModal.name,
          description: installModal.description,
          plugin_type: installModal.plugin_type,
          category: installModal.category,
          icon: installModal.icon,
          triggers: installModal.triggers,
          endpoint_url: endpointUrl,
          auth_header: authHeader || undefined,
          retry_count: installModal.retry_count,
          timeout_ms: installModal.timeout_ms,
        }),
      });
      if (!res.ok) throw new Error('Install failed');
      setInstallModal(null);
      setEndpointUrl('');
      setAuthHeader('');
      await fetchPlugins();
      setActiveTab('installed');
    } catch {
      setError('Failed to install plugin');
    } finally {
      setInstalling(false);
    }
  }

  async function togglePlugin(plugin: Plugin) {
    await fetch(`/api/v1/plugins/${plugin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
      body: JSON.stringify({ is_active: !plugin.is_active }),
    });
    await fetchPlugins();
  }

  async function deletePlugin(plugin: Plugin) {
    if (!confirm(`Deactivate "${plugin.name}"?`)) return;
    await fetch(`/api/v1/plugins/${plugin.id}`, {
      method: 'DELETE',
      headers: { 'X-Tenant-Id': tenantId },
    });
    await fetchPlugins();
  }

  const activePlugins = plugins.filter(p => p.is_active);
  const totalFires = plugins.reduce((sum, p) => sum + (p.total_fires || 0), 0);
  const totalErrors = plugins.reduce((sum, p) => sum + (p.total_errors || 0), 0);

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Plugin System</h1>
          <p className="page-description">Connect governance events to external systems via webhooks.</p>
        </div>
      </div>

      {error && (
        <div className="callout callout-danger" style={{ marginBottom: '1rem' }}>{error}</div>
      )}

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Active Plugins',  value: activePlugins.length,           color: 'var(--success)' },
          { label: 'Total Installed', value: plugins.length,                  color: undefined },
          { label: 'Total Fires',     value: totalFires.toLocaleString(),     color: 'var(--accent)' },
          { label: 'Total Errors',    value: totalErrors.toLocaleString(),    color: totalErrors > 0 ? 'var(--danger)' : undefined },
        ].map((s, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {(['installed', 'catalog'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`tab${activeTab === tab ? ' active' : ''}`}>
            {tab === 'installed' ? `Installed (${plugins.length})` : `Catalog (${templates.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <p className="t-body-sm text-tertiary">Loading plugins\u2026</p>
        </div>
      ) : activeTab === 'installed' ? (
        plugins.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No plugins installed yet</p>
            <p className="empty-state-body">Browse the catalog to connect your first integration.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => setActiveTab('catalog')}>
              Browse Catalog
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {plugins.map(plugin => (
              <div key={plugin.id} className="surface" style={{ padding: '1.25rem', opacity: plugin.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>{plugin.icon || '\uD83D\uDD0C'}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{plugin.name}</span>
                        <span className={CATEGORY_BADGE[plugin.category] || CATEGORY_BADGE.custom} style={{ textTransform: 'capitalize' }}>{plugin.category}</span>
                        {!plugin.is_active && <span className="badge badge-neutral">Inactive</span>}
                      </div>
                      <p className="t-body-sm text-secondary">{plugin.description}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    <button className={`btn ${plugin.is_active ? 'btn-ghost' : 'btn-outline'}`} style={{ fontSize: '0.75rem' }} onClick={() => togglePlugin(plugin)}>
                      {plugin.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-danger" style={{ fontSize: '0.75rem' }} onClick={() => deletePlugin(plugin)}>Remove</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="t-caption">Fires: <strong>{plugin.total_fires || 0}</strong></span>
                  <span className="t-caption">Errors: <strong style={{ color: plugin.total_errors > 0 ? 'var(--danger)' : undefined }}>{plugin.total_errors || 0}</strong></span>
                  <span className="t-caption">Retry: <strong>{plugin.retry_count}x</strong></span>
                  <span className="t-caption">Timeout: <strong>{plugin.timeout_ms}ms</strong></span>
                  {plugin.last_fired_at && <span className="t-caption">Last fired: <strong>{new Date(plugin.last_fired_at).toLocaleString()}</strong></span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.625rem' }}>
                  {plugin.triggers.map(t => <span key={t} className="badge badge-neutral t-mono" style={{ letterSpacing: 0 }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {templates.map(template => {
            const alreadyInstalled = plugins.some(p => p.name === template.name);
            return (
              <div key={template.id} className="surface" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>{template.icon || '\uD83D\uDD0C'}</span>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{template.name}</div>
                      <span className={CATEGORY_BADGE[template.category] || CATEGORY_BADGE.custom} style={{ textTransform: 'capitalize' }}>{template.category}</span>
                    </div>
                  </div>
                  <button
                    className={alreadyInstalled ? 'btn btn-ghost' : 'btn btn-primary'}
                    style={{ fontSize: '0.75rem', flexShrink: 0 }}
                    disabled={alreadyInstalled}
                    onClick={() => setInstallModal(template)}
                  >
                    {alreadyInstalled ? 'Installed' : 'Install'}
                  </button>
                </div>
                <p className="t-body-sm text-secondary" style={{ marginBottom: '0.625rem' }}>{template.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {template.triggers.map(t => <span key={t} className="badge badge-neutral t-mono" style={{ letterSpacing: 0 }}>{t}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Install Modal */}
      {installModal && (
        <div className="modal-overlay" onClick={() => { setInstallModal(null); setEndpointUrl(''); setAuthHeader(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <span className="modal-title">Install {installModal.name}</span>
              <button className="modal-close" onClick={() => { setInstallModal(null); setEndpointUrl(''); setAuthHeader(''); }} aria-label="Close">\u2715</button>
            </div>
            <div className="modal-body">
              <p className="t-body-sm text-secondary" style={{ marginBottom: '1.25rem' }}>{installModal.description}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label className="t-eyebrow" style={{ display: 'block', marginBottom: '0.375rem' }}>Endpoint URL *</label>
                  <input
                    className="form-input"
                    type="url"
                    value={endpointUrl}
                    onChange={e => setEndpointUrl(e.target.value)}
                    placeholder="https://your-webhook-url.com/endpoint"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="t-eyebrow" style={{ display: 'block', marginBottom: '0.375rem' }}>Auth Header <span className="text-tertiary">(optional)</span></label>
                  <input
                    className="form-input"
                    type="text"
                    value={authHeader}
                    onChange={e => setAuthHeader(e.target.value)}
                    placeholder="Authorization: Bearer <token>"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setInstallModal(null); setEndpointUrl(''); setAuthHeader(''); }}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={!endpointUrl || installing} onClick={installPlugin}>
                  {installing ? 'Installing\u2026' : 'Install Plugin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

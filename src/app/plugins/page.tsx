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

const CATEGORY_COLORS: Record<string, string> = {
  alerting: 'bg-red-100 text-red-700',
  observability: 'bg-purple-100 text-purple-700',
  ticketing: 'bg-blue-100 text-blue-700',
  crm: 'bg-green-100 text-green-700',
  regulatory: 'bg-yellow-100 text-yellow-700',
  custom: 'bg-gray-100 text-gray-700',
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plugin System</h1>
        <p className="text-gray-500 mt-1">Connect TrustLayer governance events to external systems via webhooks</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Plugins', value: activePlugins.length, color: 'text-green-600' },
          { label: 'Total Installed', value: plugins.length, color: 'text-blue-600' },
          { label: 'Total Fires', value: totalFires.toLocaleString(), color: 'text-purple-600' },
          { label: 'Total Errors', value: totalErrors.toLocaleString(), color: totalErrors > 0 ? 'text-red-600' : 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['installed', 'catalog'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'installed' ? `Installed (${plugins.length})` : `Catalog (${templates.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading plugins...</div>
      ) : activeTab === 'installed' ? (
        plugins.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔌</div>
            <p className="text-gray-600 font-medium">No plugins installed yet</p>
            <p className="text-gray-400 text-sm mt-1">Browse the catalog to get started</p>
            <button
              onClick={() => setActiveTab('catalog')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plugins.map(plugin => (
              <div key={plugin.id} className={`bg-white border rounded-lg p-5 ${!plugin.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{plugin.icon || '🔌'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{plugin.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[plugin.category] || CATEGORY_COLORS.custom}`}>
                          {plugin.category}
                        </span>
                        {!plugin.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{plugin.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePlugin(plugin)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        plugin.is_active
                          ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          : 'border-green-300 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {plugin.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deletePlugin(plugin)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
                  <span>Fires: <strong className="text-gray-700">{plugin.total_fires || 0}</strong></span>
                  <span>Errors: <strong className={plugin.total_errors > 0 ? 'text-red-600' : 'text-gray-700'}>{plugin.total_errors || 0}</strong></span>
                  <span>Retry: <strong className="text-gray-700">{plugin.retry_count}x</strong></span>
                  <span>Timeout: <strong className="text-gray-700">{plugin.timeout_ms}ms</strong></span>
                  {plugin.last_fired_at && (
                    <span>Last fired: <strong className="text-gray-700">{new Date(plugin.last_fired_at).toLocaleString()}</strong></span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {plugin.triggers.map(t => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(template => {
            const alreadyInstalled = plugins.some(p => p.name === template.name);
            return (
              <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon || '🔌'}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{template.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom}`}>
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <button
                    disabled={alreadyInstalled}
                    onClick={() => setInstallModal(template)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      alreadyInstalled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {alreadyInstalled ? 'Installed' : 'Install'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-3">{template.description}</p>
                <div className="flex flex-wrap gap-1">
                  {template.triggers.map(t => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{t}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Install Modal */}
      {installModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">Install {installModal.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{installModal.description}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL *</label>
                <input
                  type="url"
                  value={endpointUrl}
                  onChange={e => setEndpointUrl(e.target.value)}
                  placeholder="https://your-webhook-url.com/endpoint"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auth Header (optional)</label>
                <input
                  type="text"
                  value={authHeader}
                  onChange={e => setAuthHeader(e.target.value)}
                  placeholder="Authorization: Bearer <token>"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setInstallModal(null); setEndpointUrl(''); setAuthHeader(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={installPlugin}
                disabled={!endpointUrl || installing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {installing ? 'Installing...' : 'Install Plugin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

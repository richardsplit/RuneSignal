'use client';

import { useState, useEffect } from 'react';

interface SoulTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  jurisdiction: string;
  price_usd: number;
  soul_config: Record<string, any>;
  stripe_price_id?: string;
  is_activated: boolean;
  created_at: string;
}

const INDUSTRY_ICONS: Record<string, string> = {
  financial_services: '🏦',
  healthcare: '🏥',
  insurance: '🛡️',
  technology: '💻',
  government: '🏛️',
};

export default function SoulMarketplacePage() {
  const [templates, setTemplates] = useState<SoulTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<SoulTemplate | null>(null);

  const tenantId = typeof window !== 'undefined'
    ? document.cookie.match(/tenant_id=([^;]+)/)?.[1] || 'demo-tenant'
    : 'demo-tenant';

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/soul-templates', {
        headers: { 'X-Tenant-Id': tenantId },
      });
      const json = await res.json();
      setTemplates(json.templates || []);
    } catch {
      setError('Failed to load SOUL templates');
    } finally {
      setLoading(false);
    }
  }

  async function activateTemplate(template: SoulTemplate) {
    setActivating(template.id);
    setError('');
    try {
      const res = await fetch(`/api/v1/soul-templates/${template.id}/activate`, {
        method: 'POST',
        headers: { 'X-Tenant-Id': tenantId },
      });
      const json = await res.json();
      if (res.status === 402) {
        setError(`${json.error}. Upgrade at ${json.upgrade_url}`);
      } else if (!res.ok) {
        setError(json.error || 'Activation failed');
      } else {
        setSuccessMsg(`"${template.name}" activated successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        await fetchTemplates();
        setSelectedTemplate(null);
      }
    } catch {
      setError('Activation request failed');
    } finally {
      setActivating(null);
    }
  }

  async function deactivateTemplate(template: SoulTemplate) {
    if (!confirm(`Deactivate "${template.name}"?`)) return;
    setActivating(template.id);
    try {
      await fetch(`/api/v1/soul-templates/${template.id}/activate`, {
        method: 'DELETE',
        headers: { 'X-Tenant-Id': tenantId },
      });
      await fetchTemplates();
    } finally {
      setActivating(null);
    }
  }

  const industries = ['all', ...Array.from(new Set(templates.map(t => t.industry).filter(Boolean)))];
  const filtered = filterIndustry === 'all' ? templates : templates.filter(t => t.industry === filterIndustry);
  const activated = templates.filter(t => t.is_activated);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SOUL Marketplace</h1>
        <p className="text-gray-500 mt-1">
          Pre-built AI ethics configurations for regulated industries. Activate a SOUL template to instantly apply compliance-ready moral constraints to all your AI agents.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{successMsg}</div>
      )}

      {/* Active SOUL */}
      {activated.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-blue-800 mb-2">Active SOUL Templates ({activated.length})</h2>
          <div className="flex flex-wrap gap-2">
            {activated.map(t => (
              <div key={t.id} className="flex items-center gap-2 bg-white border border-blue-200 rounded-full px-3 py-1">
                <span className="text-sm">{INDUSTRY_ICONS[t.industry] || '⚙️'}</span>
                <span className="text-sm font-medium text-blue-800">{t.name}</span>
                <button
                  onClick={() => deactivateTemplate(t)}
                  disabled={activating === t.id}
                  className="text-blue-400 hover:text-red-500 text-xs ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {industries.map(ind => (
          <button
            key={ind}
            onClick={() => setFilterIndustry(ind)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors capitalize ${
              filterIndustry === ind
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {INDUSTRY_ICONS[ind] || ''} {ind === 'all' ? 'All Templates' : ind.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template => (
            <div
              key={template.id}
              className={`bg-white border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer ${
                template.is_activated ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{INDUSTRY_ICONS[template.industry] || '⚙️'}</span>
                  <div>
                    {template.is_activated && (
                      <div className="text-xs text-blue-600 font-medium mb-0.5">● Active</div>
                    )}
                    <div className="font-semibold text-gray-900 text-sm leading-tight">{template.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  {template.price_usd === 0 ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Free</span>
                  ) : (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      €{template.price_usd.toLocaleString()}/yr
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {template.jurisdiction && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{template.jurisdiction}</span>
                  )}
                  {template.industry && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                      {template.industry.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                {template.is_activated ? (
                  <button
                    onClick={e => { e.stopPropagation(); deactivateTemplate(template); }}
                    disabled={activating === template.id}
                    className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); activateTemplate(template); }}
                    disabled={activating === template.id}
                    className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {activating === template.id ? '...' : template.price_usd === 0 ? 'Activate Free' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{INDUSTRY_ICONS[selectedTemplate.industry] || '⚙️'}</span>
                <div>
                  <h2 className="text-lg font-bold">{selectedTemplate.name}</h2>
                  <div className="text-sm text-gray-500">
                    {selectedTemplate.jurisdiction} · {selectedTemplate.industry?.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedTemplate(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{selectedTemplate.description}</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-xs font-medium text-gray-500 mb-2">SOUL Configuration Preview</div>
              <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedTemplate.soul_config, null, 2).slice(0, 600)}...
              </pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium"
              >
                Close
              </button>
              {selectedTemplate.is_activated ? (
                <button
                  onClick={() => deactivateTemplate(selectedTemplate)}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => activateTemplate(selectedTemplate)}
                  disabled={activating === selectedTemplate.id}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {selectedTemplate.price_usd === 0 ? 'Activate Free' : `Activate (€${selectedTemplate.price_usd.toLocaleString()}/yr)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

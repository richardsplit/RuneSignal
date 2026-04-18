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
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">SOUL Marketplace</h1>
        <p className="page-description">
          Pre-built AI ethics configurations for regulated industries. Activate a SOUL template to instantly apply compliance-ready moral constraints to all your AI agents.
        </p>
      </div>

      {error && <div className="callout callout-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
      {successMsg && <div className="callout callout-success" style={{ marginBottom: '1rem' }}>{successMsg}</div>}

      {/* Active SOULs */}
      {activated.length > 0 && (
        <div className="callout callout-info" style={{ marginBottom: '1.25rem' }}>
          <span className="t-eyebrow" style={{ marginBottom: '0.5rem', display: 'block' }}>Active SOUL Templates ({activated.length})</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {activated.map(t => (
              <span key={t.id} className="chip chip-accent" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                {INDUSTRY_ICONS[t.industry] || '⚙️'} {t.name}
                <button
                  onClick={() => deactivateTemplate(t)}
                  disabled={activating === t.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', lineHeight: 1, marginLeft: '0.125rem' }}
                  aria-label="Deactivate"
                >×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Industry filter */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {industries.map(ind => (
          <button
            key={ind}
            onClick={() => setFilterIndustry(ind)}
            className={`chip${filterIndustry === ind ? ' chip-accent' : ''}`}
            style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', textTransform: 'capitalize' }}
          >
            {INDUSTRY_ICONS[ind] || ''} {ind === 'all' ? 'All Templates' : ind.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <p className="t-body-sm text-tertiary">Loading templates\u2026</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filtered.map(template => (
            <div
              key={template.id}
              className="surface"
              style={{
                padding: '1.25rem',
                cursor: 'pointer',
                border: `1px solid ${template.is_activated ? 'var(--accent-border)' : 'var(--border-default)'}`,
                background: template.is_activated ? 'var(--accent-dim)' : undefined,
                transition: 'border-color var(--t-fast)',
              }}
              onClick={() => setSelectedTemplate(template)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{INDUSTRY_ICONS[template.industry] || '⚙️'}</span>
                  <div>
                    {template.is_activated && <div className="t-eyebrow" style={{ color: 'var(--accent)', marginBottom: '0.125rem' }}>● Active</div>}
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3 }}>{template.name}</div>
                  </div>
                </div>
                {template.price_usd === 0
                  ? <span className="badge badge-success">Free</span>
                  : <span className="badge badge-accent">\u20ac{template.price_usd.toLocaleString()}/yr</span>
                }
              </div>
              <p className="t-caption" style={{ marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {template.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {template.jurisdiction && <span className="badge badge-neutral">{template.jurisdiction}</span>}
                  {template.industry && <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{template.industry.replace(/_/g, ' ')}</span>}
                </div>
                {template.is_activated ? (
                  <button
                    className="btn btn-danger"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.625rem' }}
                    onClick={e => { e.stopPropagation(); deactivateTemplate(template); }}
                    disabled={activating === template.id}
                  >Deactivate</button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.625rem' }}
                    onClick={e => { e.stopPropagation(); activateTemplate(template); }}
                    disabled={activating === template.id}
                  >{activating === template.id ? '\u2026' : template.price_usd === 0 ? 'Activate Free' : 'Activate'}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedTemplate && (
        <div className="modal-overlay" onClick={() => setSelectedTemplate(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{INDUSTRY_ICONS[selectedTemplate.industry] || '⚙️'}</span>
                <div>
                  <span className="modal-title">{selectedTemplate.name}</span>
                  <div className="t-caption">{selectedTemplate.jurisdiction} · {selectedTemplate.industry?.replace(/_/g, ' ')}</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedTemplate(null)} aria-label="Close">\u00d7</button>
            </div>
            <div className="modal-body">
              <p className="t-body-sm text-secondary" style={{ marginBottom: '1rem' }}>{selectedTemplate.description}</p>
              <div className="surface" style={{ padding: '0.75rem', background: 'var(--surface-3)', marginBottom: '1rem' }}>
                <p className="t-eyebrow" style={{ marginBottom: '0.5rem' }}>SOUL Configuration Preview</p>
                <pre className="t-mono" style={{ fontSize: '0.6875rem', whiteSpace: 'pre-wrap', margin: 0, color: 'var(--text-secondary)' }}>
                  {JSON.stringify(selectedTemplate.soul_config, null, 2).slice(0, 600)}\u2026
                </pre>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSelectedTemplate(null)}>Close</button>
                {selectedTemplate.is_activated ? (
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => deactivateTemplate(selectedTemplate)}>Deactivate</button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={activating === selectedTemplate.id}
                    onClick={() => activateTemplate(selectedTemplate)}
                  >
                    {selectedTemplate.price_usd === 0 ? 'Activate Free' : `Activate (\u20ac${selectedTemplate.price_usd.toLocaleString()}/yr)`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface EvidencePack {
  id: string;
  pack_name: string;
  regulation: string;
  pack_type: string;
  status: 'generating' | 'ready' | 'failed';
  coverage_score: number;
  clauses_covered: number;
  clauses_total: number;
  manifest_hash: string;
  signature: string;
  signed_at: string;
  date_from: string;
  date_to: string;
  template_id: string | null;
  created_by: string | null;
  created_at: string;
  evidence_manifest: Record<string, unknown>;
  gaps: Array<{ hint: string }>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  regulation: string;
  pack_type: string;
  notified_body: string | null;
  framework_clauses: string[];
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const REGULATION_META: Record<string, { label: string; color: string; badge: string }> = {
  eu_ai_act:   { label: 'EU AI Act',    color: '#3b82f6', badge: 'Annex IV' },
  iso_42001:   { label: 'ISO 42001',    color: '#8b5cf6', badge: 'AI-MS' },
  nist_ai_rmf: { label: 'NIST AI RMF', color: '#06b6d4', badge: 'RMF 1.0' },
  soc2:        { label: 'SOC 2',        color: '#10b981', badge: 'Type II' },
  hipaa:       { label: 'HIPAA',        color: '#f59e0b', badge: 'PHI' },
  insurance:   { label: 'Insurance',    color: '#ef4444', badge: 'Carrier' },
};

const TEMPLATES: Template[] = [
  { id: 'eu_ai_act_annex_iv', name: 'EU AI Act — Annex IV', description: 'Mandatory for high-risk AI systems. Deadline: 2 August 2026.', regulation: 'eu_ai_act', pack_type: 'regulator', notified_body: 'TÜV', framework_clauses: ['Art.13', 'Art.14', 'Art.17', 'Art.29'] },
  { id: 'iso_42001_full',     name: 'ISO 42001 — AI Management System', description: 'ISO/IEC 42001:2023 full evidence pack.', regulation: 'iso_42001', pack_type: 'regulator', notified_body: null, framework_clauses: ['6.1', '7.5', '8.4', '9.1', '10.2'] },
  { id: 'nist_ai_rmf_1',     name: 'NIST AI RMF 1.0', description: 'US NIST AI Risk Management Framework. All 4 core functions.', regulation: 'nist_ai_rmf', pack_type: 'regulator', notified_body: null, framework_clauses: ['GOVERN', 'MAP', 'MEASURE', 'MANAGE'] },
  { id: 'munich_re_insurance', name: 'Munich Re — AI Liability Pack', description: 'Carrier-ready. Loss-event sampling + anomaly rates.', regulation: 'insurance', pack_type: 'insurance', notified_body: null, framework_clauses: ['Loss Sampling', 'Anomaly Rate', 'HITL Coverage'] },
];

/* ─── Helpers ───────────────────────────────────────────────────────── */
function scoreColor(score: number): string {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function EvidenceStudioPage() {
  const { tenantId } = useTenant();
  const [packs, setPacks]       = useState<EvidencePack[]>([]);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [filterReg, setFilterReg] = useState<string>('all');
  const [showGenerate, setShowGenerate] = useState(false);

  // Generate form state
  const [genTemplate, setGenTemplate] = useState<Template>(TEMPLATES[0]);
  const [genDays, setGenDays]         = useState(30);
  const [genError, setGenError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch('/api/v1/evidence/packs', { headers });
      if (!res.ok) throw new Error('Failed to load packs');
      const data = await res.json();
      setPacks(data.packs ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const dateTo   = new Date();
      const dateFrom = new Date(Date.now() - genDays * 86400000);
      const res = await fetch('/api/v1/evidence/packs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          regulation:  genTemplate.regulation,
          pack_type:   genTemplate.pack_type,
          template_id: genTemplate.id,
          date_from:   dateFrom.toISOString(),
          date_to:     dateTo.toISOString(),
          pack_name:   `${genTemplate.name} — ${dateTo.toLocaleDateString('en-GB')}`,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Generation failed'); }
      setShowGenerate(false);
      await load();
    } catch (e: any) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (pack: EvidencePack, format: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch(`/api/v1/evidence/packs/${pack.id}/export`, { method: 'POST', headers, body: JSON.stringify({ format }) });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url;
      a.download = `evidence-pack-${pack.regulation}-${pack.id.slice(0, 8)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  const filtered = filterReg === 'all' ? packs : packs.filter(p => p.regulation === filterReg);

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Evidence Pack Studio</h1>
          <p className="page-description">Generate, sign, and export regulator-grade and insurance-carrier evidence packs from your live agent audit trail.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowGenerate(true)} style={{ flexShrink: 0 }}>
          + Generate Pack
        </button>
      </div>

      {/* KPI strip */}
      <div className="kpi-strip" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Packs',     value: packs.length },
          { label: 'Ready',           value: packs.filter(p => p.status === 'ready').length, color: 'var(--success)' },
          { label: 'Regulator Packs', value: packs.filter(p => p.pack_type === 'regulator').length, color: '#3b82f6' },
          { label: 'Insurance Packs', value: packs.filter(p => p.pack_type === 'insurance').length, color: '#ef4444' },
          { label: 'Avg Coverage',    value: packs.length > 0 ? `${Math.round(packs.reduce((s, p) => s + (p.coverage_score ?? 0), 0) / packs.length)}%` : '—', color: packs.length > 0 ? scoreColor(packs.reduce((s, p) => s + (p.coverage_score ?? 0), 0) / packs.length) : undefined },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{loading ? '…' : k.value}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ padding: '0.75rem 1rem', background: '#ef444415', border: '1px solid #ef444433', borderRadius: 8, color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['all', ...Object.keys(REGULATION_META)].map(reg => (
          <button key={reg} onClick={() => setFilterReg(reg)}
            style={{ padding: '0.3125rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', border: `1px solid ${filterReg === reg ? 'var(--accent)' : 'var(--border)'}`, background: filterReg === reg ? 'var(--accent)' : 'transparent', color: filterReg === reg ? 'var(--text-inverse)' : 'var(--text-secondary)' }}>
            {reg === 'all' ? 'All' : (REGULATION_META[reg]?.label ?? reg)}
          </button>
        ))}
      </div>

      {/* Pack list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton-pulse" style={{ height: 88, borderRadius: 8 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 8 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔏</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>No evidence packs yet</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Generate your first signed Evidence Pack from the live audit trail.</div>
          <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>Generate First Pack</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(pack => {
            const meta = REGULATION_META[pack.regulation] ?? { label: pack.regulation, color: 'var(--text-muted)', badge: '' };
            return (
              <div key={pack.id} className="surface" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

                {/* Coverage ring */}
                <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: '50%', border: `3px solid ${scoreColor(pack.coverage_score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: scoreColor(pack.coverage_score), lineHeight: 1 }}>{pack.coverage_score}%</span>
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{pack.pack_name}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: 999, background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}33` }}>
                      {meta.label}
                    </span>
                    {pack.pack_type === 'insurance' && (
                      <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: '#ef444415', color: '#ef4444', border: '1px solid #ef444433' }}>Insurance</span>
                    )}
                    <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: 999, background: 'var(--success-bg, #34d39915)', color: 'var(--success)', border: '1px solid #34d39933' }}>✓ Signed</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {pack.clauses_covered}/{pack.clauses_total} clauses · Hash: <span className="mono" style={{ fontSize: '0.6875rem' }}>{pack.manifest_hash?.slice(0, 16)}…</span> · {relativeTime(pack.created_at)}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }} onClick={() => handleExport(pack, 'json')}>Export JSON</button>
                  {pack.regulation === 'eu_ai_act' && (
                    <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }} onClick={() => handleExport(pack, 'eu_ai_act')}>Annex IV</button>
                  )}
                  {pack.pack_type === 'insurance' && (
                    <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }} onClick={() => handleExport(pack, 'insurance')}>Carrier Export</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate modal */}
      {showGenerate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowGenerate(false)}>
          <div className="surface" style={{ width: '100%', maxWidth: 520, padding: '1.75rem', borderRadius: 12 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>Generate Evidence Pack</h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>TEMPLATE</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {TEMPLATES.map(t => (
                  <div key={t.id} onClick={() => setGenTemplate(t)}
                    style={{ padding: '0.75rem 1rem', borderRadius: 8, cursor: 'pointer', border: `1px solid ${genTemplate.id === t.id ? 'var(--accent)' : 'var(--border)'}`, background: genTemplate.id === t.id ? 'var(--accent-dim, #3b82f615)' : 'var(--bg-surface-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{t.name}</span>
                      {t.notified_body && <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Pre-signed: {t.notified_body}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>DATE RANGE</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[30, 60, 90].map(d => (
                  <button key={d} onClick={() => setGenDays(d)}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8125rem', border: `1px solid ${genDays === d ? 'var(--accent)' : 'var(--border)'}`, background: genDays === d ? 'var(--accent)' : 'transparent', color: genDays === d ? 'var(--text-inverse)' : 'var(--text-secondary)', fontWeight: genDays === d ? 600 : 400 }}>
                    Last {d}d
                  </button>
                ))}
              </div>
            </div>

            {genError && <div style={{ padding: '0.625rem 0.875rem', background: '#ef444415', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', fontSize: '0.8125rem', marginBottom: '1rem' }}>{genError}</div>}

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowGenerate(false)} disabled={generating}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generating…' : 'Generate & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

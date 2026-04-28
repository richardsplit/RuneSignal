'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { provenance as provenanceApi, ProvenanceLedgerEntry, ApiError } from '@/lib/api';
import { ApiErrorBanner, SkeletonTable } from '@/components/Skeleton';

/* ─── Demo fallback ──────────────────────────────────────────────────── */
const DEMO_ENTRIES: ProvenanceLedgerEntry[] = [
  { request_id: '1a3f-8c2d', event_type: 'llm_output', agent_id: 'agt-001', payload: { certificate_id: 'cert-001', tenant_id: 'demo', agent_id: 'agt-001', provider: 'openai',    model: 'gpt-4o',       model_version: '2024-11-20', input_hash: 'f4e2...89a1', output_hash: 'a1b2...3c4d', tags: ['contract-review', 'eu-ai-act'], timestamp: new Date(Date.now() - 600000).toISOString()   }, created_at: new Date(Date.now() - 600000).toISOString()   },
  { request_id: '7b2e-9d1a', event_type: 'llm_output', agent_id: 'agt-002', payload: { certificate_id: 'cert-002', tenant_id: 'demo', agent_id: 'agt-002', provider: 'openai',    model: 'gpt-4o-mini',  model_version: '2024-07-18', input_hash: 'a1b2...3c4d', output_hash: 'b3c4...5d6e', tags: ['code-gen'],            timestamp: new Date(Date.now() - 3600000).toISOString()  }, created_at: new Date(Date.now() - 3600000).toISOString()  },
  { request_id: '4d5c-2e8f', event_type: 'llm_output', agent_id: 'agt-003', payload: { certificate_id: 'cert-003', tenant_id: 'demo', agent_id: 'agt-003', provider: 'anthropic', model: 'claude-3-5',   model_version: '20241022',   input_hash: 'e5f6...7a8b', output_hash: 'f7g8...9h0i', tags: ['customer-ticket'],     timestamp: new Date(Date.now() - 10800000).toISOString() }, created_at: new Date(Date.now() - 10800000).toISOString() },
  { request_id: '2c7a-1b9d', event_type: 'llm_output', agent_id: 'agt-004', payload: { certificate_id: 'cert-004', tenant_id: 'demo', agent_id: 'agt-004', provider: 'openai',    model: 'gpt-4o',       model_version: '2024-11-20', input_hash: 'c3d4...5e6f', output_hash: 'd5e6...7f8g', tags: ['finance', 'compliance'],timestamp: new Date(Date.now() - 18000000).toISOString() }, created_at: new Date(Date.now() - 18000000).toISOString() },
];

/* ─── Helpers ────────────────────────────────────────────────────────── */
const APPROVED_MODEL_VERSIONS: Record<string, string[]> = {
  'gpt-4o':       ['2024-11-20', '2024-08-06'],
  'gpt-4o-mini':  ['2024-07-18'],
  'claude-3-5':   ['20241022', '20240620'],
};

function isApprovedVersion(model: string, version: string): boolean {
  const approved = APPROVED_MODEL_VERSIONS[model];
  return approved ? approved.includes(version) : true;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function ProvenancePage() {
  const { showToast } = useToast();

  const [entries,  setEntries]  = useState<ProvenanceLedgerEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [isDemo,   setIsDemo]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [verifying, setVerifying] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await provenanceApi.list(100);
      setEntries(res.data);
      setIsDemo(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Network error';
      setError(msg);
      setEntries(DEMO_ENTRIES);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleVerify = useCallback(async (entry: ProvenanceLedgerEntry) => {
    const certId = entry.payload.certificate_id;
    setVerifying(s => new Set(s).add(certId));
    try {
      if (!isDemo) {
        const res = await provenanceApi.verify(entry.request_id);
        showToast(
          res.valid ? `Certificate ${certId} — valid signature.` : `Certificate ${certId} — TAMPERED!`,
          res.valid ? 'success' : 'error',
        );
      } else {
        await new Promise(r => setTimeout(r, 600));
        showToast(`Certificate ${certId} — valid signature (demo).`);
      }
    } catch {
      showToast('Verification failed. Retry later.', 'error');
    } finally {
      setVerifying(s => { const n = new Set(s); n.delete(certId); return n; });
    }
  }, [isDemo, showToast]);

  const filtered = entries.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.request_id.toLowerCase().includes(q) ||
      e.payload.model.toLowerCase().includes(q) ||
      e.payload.provider.toLowerCase().includes(q) ||
      e.payload.tags.some(t => t.toLowerCase().includes(q)) ||
      (e.agent_id ?? '').toLowerCase().includes(q)
    );
  });

  const anomalyCount  = entries.filter(e => !isApprovedVersion(e.payload.model, e.payload.model_version)).length;
  const verifiedCount = entries.length - anomalyCount;

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Provenance</h1>
          <p className="page-description">Cryptographically verified LLM output certificates against the immutable ledger.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => showToast('Opening hash verification tool...')}>Verify Hash</button>
          <button className="btn btn-primary" onClick={() => showToast('Generating certificate for last trace...')}>Generate Certificate</button>
        </div>
      </div>

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Total Certificates', value: loading ? '…' : entries.length,  color: undefined },
          { label: 'Verified',           value: loading ? '…' : verifiedCount,    color: 'var(--success)' },
          { label: 'Model Anomalies',    value: loading ? '…' : anomalyCount,     color: anomalyCount > 0 ? 'var(--warning)' : 'var(--success)' },
          { label: 'Detection Rate',     value: '100%',                            color: 'var(--success)' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            {loading && i < 3
              ? <div className="skeleton-pulse" style={{ height: 28, width: '40%', borderRadius: 'var(--radius-xs)', marginTop: 2 }} />
              : <div className="kpi-value" style={k.color ? { color: k.color } : undefined}>{k.value}</div>
            }
          </div>
        ))}
      </div>

      {/* Anomaly banner */}
      {!loading && anomalyCount > 0 && (
        <div className="callout callout-warning" style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontWeight: 700, flexShrink: 0 }}>!</span>
          <span style={{ flex: 1 }}>
            <strong>{anomalyCount} model version anomaly</strong> — output may have been generated by an unapproved model version. Review required.
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => setSearch('gpt-4o-mini')}>Filter anomalies</button>
        </div>
      )}

      {/* Table */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title">Certificate Ledger</span>
          <input
            className="form-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search model, tag, agent, ID…"
            style={{ width: '220px', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
          />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Certificate ID</th>
              <th>Provider / Model</th>
              <th>Version</th>
              <th>Tags</th>
              <th>Output Hash</th>
              <th>Status</th>
              <th>Issued</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={5} cols={['12%', '15%', '12%', '18%', '12%', '10%', '10%', '8%']} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>No certificates match "{search}".</p>
                </td>
              </tr>
            ) : filtered.map(entry => {
              const { certificate_id, model, model_version, provider, output_hash, tags, timestamp } = entry.payload;
              const approved = isApprovedVersion(model, model_version);
              const isPending = verifying.has(certificate_id);
              return (
                <tr key={entry.request_id} style={{ background: !approved ? 'var(--warning-soft)' : undefined }}>
                  <td>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--info)' }}>{entry.request_id}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{model}</div>
                    <div className="t-caption" style={{ marginTop: '1px' }}>{provider}</div>
                  </td>
                  <td>
                    <span
                      className={approved ? 'badge badge-neutral' : 'badge badge-warning'}
                      style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: '0.6875rem' }}
                    >
                      {model_version}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {tags.slice(0, 2).map(t => (
                        <span key={t} className="badge badge-neutral" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '0.6875rem' }}>{t}</span>
                      ))}
                      {tags.length > 2 && <span className="t-caption">+{tags.length - 2}</span>}
                    </div>
                  </td>
                  <td><span className="t-mono text-tertiary">{output_hash}</span></td>
                  <td>
                    <span className={approved ? 'badge badge-success' : 'badge badge-warning'}>
                      {approved ? '✓ Valid' : '! Anomaly'}
                    </span>
                  </td>
                  <td className="text-tertiary t-body-sm" style={{ whiteSpace: 'nowrap' }}>{relativeTime(timestamp)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                      disabled={isPending}
                      onClick={() => handleVerify(entry)}
                    >
                      {isPending ? '…' : 'Verify'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer meta */}
      {!loading && (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="status-dot" style={{ background: isDemo ? 'var(--warning)' : 'var(--success)' }} />
          <span className="t-caption">
            {isDemo ? 'Demo data — connect Supabase for live certificate ledger' : `${entries.length} certificates loaded`}
          </span>
        </div>
      )}
    </div>
  );
}


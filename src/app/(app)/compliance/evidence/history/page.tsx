'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTenant } from '@lib/contexts/TenantContext';

/* ─── Types ──────────────────────────────────────────────────────────── */

type Regulation = 'eu_ai_act' | 'iso_42001';

interface CoverageGap {
  clause_ref: string;
  status: string;
  remediation_hint: string;
}

interface BundleCoverage {
  overall_score: number;
  clauses_covered: number;
  clauses_total: number;
  gaps: CoverageGap[];
}

interface EvidenceBundle {
  id: string;
  tenant_id: string;
  version: number;
  regulation: Regulation;
  period: { start: string; end: string };
  coverage: BundleCoverage;
  generated_at: string;
  generated_by: string;
  status: string;
}

/* ─── Constants ──────────────────────────────────────────────────────── */

const REGULATION_LABELS: Record<string, string> = {
  eu_ai_act: 'EU AI Act',
  iso_42001: 'ISO 42001',
};

const PAGE_SIZE = 10;

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function EvidenceHistoryPage() {
  const { tenantId } = useTenant();
  const [bundles, setBundles] = useState<EvidenceBundle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  const fetchBundles = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (filter !== 'all') params.set('regulation', filter);
      const res = await fetch(`/api/v1/compliance/evidence-bundles?${params}`, {
        headers: { 'X-Tenant-Id': tenantId },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to fetch bundles');
      }
      const data = await res.json();
      setBundles(data.bundles || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filter, page]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const scoreColor = (score: number) =>
    score > 80 ? 'var(--success)' : score > 50 ? 'var(--warning)' : 'var(--danger)';

  const downloadJson = (bundleId: string, regulation: string) => {
    window.open(`/api/v1/compliance/reports/${bundleId}`, '_blank');
  };

  const downloadPdf = (bundleId: string) => {
    window.open(`/api/v1/compliance/reports/${bundleId}/pdf`, '_blank');
  };

  return (
    <div style={{ maxWidth: '1000px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Evidence History</h1>
          <p className="page-description">
            View and download past evidence bundles.
          </p>
        </div>
        <Link
          href="/compliance/evidence"
          className="btn btn-primary"
          style={{ fontSize: '0.8125rem', textDecoration: 'none' }}
        >
          Generate New
        </Link>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filter:</span>
        {['all', 'eu_ai_act', 'iso_42001'].map(f => (
          <button
            key={f}
            className={filter === f ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => { setFilter(f); setPage(0); }}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
          >
            {f === 'all' ? 'All' : REGULATION_LABELS[f] || f}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="callout callout-danger" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="empty-state">
          <p className="empty-state-title">Loading evidence bundles...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && bundles.length === 0 && !error && (
        <div className="empty-state">
          <p className="empty-state-title">No evidence bundles generated yet</p>
          <p className="empty-state-body">
            Generate your first evidence bundle to see it here.
          </p>
          <Link
            href="/compliance/evidence"
            className="btn btn-primary"
            style={{ marginTop: '1rem', textDecoration: 'none', fontSize: '0.8125rem' }}
          >
            Generate Evidence Bundle
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && bundles.length > 0 && (
        <>
          <div className="surface" style={{ overflow: 'hidden', marginBottom: '1rem' }}>
            <div className="panel-header">
              <span className="panel-title">Evidence Bundles</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {total} total
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Regulation</th>
                    <th>Date Range</th>
                    <th>Coverage</th>
                    <th>Generated</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bundles.map(b => (
                    <tr key={b.id}>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {REGULATION_LABELS[b.regulation] || b.regulation}
                        </span>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          v{b.version}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {b.period?.start?.slice(0, 10)} {'\u2192'} {b.period?.end?.slice(0, 10)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: scoreColor(b.coverage?.overall_score ?? 0),
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {b.coverage?.overall_score ?? 0}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {b.generated_at
                            ? new Date(b.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '\u2014'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${b.status === 'ready' ? 'badge-success' : b.status === 'generating' ? 'badge-warning' : 'badge-danger'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => downloadJson(b.id, b.regulation)}
                            title="Download JSON"
                            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                          >
                            JSON
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => downloadPdf(b.id)}
                            title="Download PDF"
                            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                          >
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', opacity: page === 0 ? 0.4 : 1 }}
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';

type ArticleStatus = 'covered' | 'partial' | 'not_covered';

interface Report {
  id: string;
  status: 'generating' | 'ready' | 'failed';
  generated_at: string;
  evidence_period_start: string;
  evidence_period_end: string;
  agent_count: number;
  action_count: number;
  hitl_reviews_count: number;
  coverage_score: number;
  article_coverage: { art_13: boolean; art_14: boolean; art_17: boolean; art_26: boolean };
  report_type: string;
  error_message?: string;
}

const ARTICLE_LABELS: Record<string, { label: string; desc: string }> = {
  art_13: { label: 'Art. 13', desc: 'Transparency' },
  art_14: { label: 'Art. 14', desc: 'Human Oversight' },
  art_17: { label: 'Art. 17', desc: 'Quality Management' },
  art_26: { label: 'Art. 26', desc: 'Deployer Obligations' },
};

function CoverageScoreBadge({ score }: { score: number }) {
  const cls = score >= 90 ? 'badge-success' : score >= 60 ? 'badge-warning' : 'badge-danger';
  return (
    <span className={`badge ${cls}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {score.toFixed(1)}% cryptographic coverage
    </span>
  );
}

function ArticleCoverageGrid({ coverage }: { coverage: Record<string, boolean> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', margin: '0.75rem 0' }}>
      {Object.entries(ARTICLE_LABELS).map(([key, { label, desc }]) => {
        const covered = coverage?.[key];
        return (
          <div key={key} style={{
            border: `1px solid ${covered ? 'var(--success-border)' : 'var(--danger-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem',
            background: covered ? 'var(--success-soft)' : 'var(--danger-soft)',
            textAlign: 'center',
          }}>
            <div className="t-eyebrow" style={{ color: covered ? 'var(--success)' : 'var(--danger)' }}>{label}</div>
            <div className="t-caption" style={{ marginTop: '2px' }}>{desc}</div>
            <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: covered ? 'var(--success)' : 'var(--danger)' }}>{covered ? '✓' : '✗'}</div>
          </div>
        );
      })}
    </div>
  );
}

function ReportStatusCard({ report, onRefresh }: { report: Report; onRefresh: () => void }) {
  useEffect(() => {
    if (report.status === 'generating') {
      const timer = setTimeout(onRefresh, 4000);
      return () => clearTimeout(timer);
    }
  }, [report.status, onRefresh]);

  return (
    <div style={{
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      background: 'var(--surface-1)',
      marginBottom: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {report.report_type === 'EU_AI_ACT_2024' ? 'EU AI Act 2024' : 'NIST AI RMF'}
          </span>
          <span style={{
            fontSize: '0.625rem',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
            background: report.status === 'ready' ? 'var(--success-soft)' : report.status === 'failed' ? 'var(--danger-soft)' : 'var(--info-soft)',
            color: report.status === 'ready' ? 'var(--success)' : report.status === 'failed' ? 'var(--danger)' : 'var(--info)',
            fontWeight: 600,
          }}>
            {report.status === 'generating' ? '⏳ Generating…' : report.status === 'ready' ? '✓ Ready' : '✗ Failed'}
          </span>
        </div>
        {report.status === 'ready' && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <a
              href={`/api/v1/compliance/reports/${report.id}`}
              target="_blank"
              download
              className="btn btn-ghost"
              style={{ fontSize: '0.6875rem' }}
            >
              ↓ JSON
            </a>
            <a
              href={`/api/v1/compliance/reports/${report.id}/pdf`}
              target="_blank"
              download
              className="btn btn-primary"
              style={{ fontSize: '0.6875rem' }}
            >
              ↓ PDF Report
            </a>
          </div>
        )}
      </div>

      <div className="t-caption" style={{ marginBottom: '0.5rem' }}>
        {new Date(report.evidence_period_start).toLocaleDateString()} → {new Date(report.evidence_period_end).toLocaleDateString()}
        {' · '}Generated {new Date(report.generated_at).toLocaleString()}
      </div>

      {report.status === 'generating' && (
        <div className="t-caption" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
          Compiling evidence from S3 ledger, S7 HITL records, and S11 explainability logs…
        </div>
      )}

      {report.status === 'ready' && (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{report.agent_count}</strong> agents
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{report.action_count}</strong> actions
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{report.hitl_reviews_count}</strong> HITL reviews
            </span>
            <CoverageScoreBadge score={report.coverage_score || 0} />
          </div>
          <ArticleCoverageGrid coverage={report.article_coverage} />
        </>
      )}

      {report.status === 'failed' && (
        <div className="callout callout-danger" style={{ padding: '0.5rem 0.75rem', marginTop: '0.5rem' }}>
          Generation failed: {report.error_message || 'Unknown error'}
        </div>
      )}
    </div>
  );
}

export default function ComplianceReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    framework: 'EU_AI_ACT_2024',
  });

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/compliance/reports?limit=10');
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : data.reports || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/compliance/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_start: new Date(form.period_start).toISOString(),
          period_end: new Date(form.period_end).toISOString(),
          framework: form.framework,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }
      await fetchReports();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Compliance Reports</h1>
        <p className="page-description">
          Generate EU AI Act evidence packages mapped to Articles 13, 14, 17, and 26.
          Enforcement deadline: <strong style={{ color: 'var(--warning)' }}>August 2, 2026</strong>.
        </p>
      </div>

      {/* Generator Form */}
      <div className="surface" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Generate Evidence Package</h2>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-field">
            <label className="form-label">From</label>
            <input className="form-input" type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label className="form-label">To</label>
            <input className="form-input" type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} required />
          </div>
          <div className="form-field">
            <label className="form-label">Framework</label>
            <select className="form-input" value={form.framework} onChange={e => setForm(f => ({ ...f, framework: e.target.value }))}>
              <option value="EU_AI_ACT_2024">EU AI Act 2024</option>
              <option value="NIST_AI_RMF">NIST AI RMF</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={generating}>
            {generating ? 'Generating…' : 'Generate Report'}
          </button>
        </form>
        {error && <div className="callout callout-danger" style={{ marginTop: '0.75rem' }}>{error}</div>}
      </div>

      {/* Reports List */}
      <div>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Past Reports</h2>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2].map(i => (
              <div key={i} className="skeleton-pulse" style={{ height: '100px', borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No reports yet</p>
            <p className="empty-state-body">Generate your first EU AI Act evidence package.</p>
          </div>
        ) : (
          reports.map(report => (
            <ReportStatusCard key={report.id} report={report} onRefresh={fetchReports} />
          ))
        )}
      </div>
    </div>
  );
}

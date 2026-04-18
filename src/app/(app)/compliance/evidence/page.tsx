'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTenant } from '@lib/contexts/TenantContext';

/* ─── Types ──────────────────────────────────────────────────────────── */

type Regulation = 'eu_ai_act' | 'iso_42001';

interface RegulationClause {
  clause_ref: string;
  clause_title: string;
  description: string;
  evidence_sources: string[];
  required_for_coverage: boolean;
}

interface RegulationInfo {
  regulation: string;
  clauses: RegulationClause[];
}

interface CoverageGap {
  clause_ref: string;
  status: 'not_covered' | 'partial';
  remediation_hint: string;
}

interface BundleCoverage {
  overall_score: number;
  clauses_covered: number;
  clauses_total: number;
  gaps: CoverageGap[];
}

interface ExportResult {
  export_id: string;
  regulation: Regulation;
  status: string;
  evidence_manifest: any;
  coverage?: BundleCoverage;
}

/* ─── Constants ──────────────────────────────────────────────────────── */

const REGULATIONS: Array<{
  id: Regulation;
  name: string;
  description: string;
  clauses: number;
}> = [
  {
    id: 'eu_ai_act',
    name: 'EU AI Act',
    description: 'European Union Artificial Intelligence Act (Regulation 2024/1689). Covers transparency, human oversight, quality management, and deployer obligations.',
    clauses: 4,
  },
  {
    id: 'iso_42001',
    name: 'ISO 42001',
    description: 'AI Management System standard (ISO/IEC 42001:2023). Covers risk management, technical documentation, oversight logs, accuracy, and incident reporting.',
    clauses: 5,
  },
];

const PRESETS = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
  { label: 'Last 90 days', days: 90 },
];

/* ─── Step indicator ─────────────────────────────────────────────────── */

function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = ['Regulation', 'Date Range', 'Preview', 'Generate', 'Results'];
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '2rem' }}>
      {steps.slice(0, total).map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {i > 0 && (
              <div style={{
                width: 24,
                height: 1,
                background: isDone ? 'var(--accent)' : 'var(--border-default)',
              }} />
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.625rem',
                fontWeight: 700,
                background: isActive ? 'var(--accent)' : isDone ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                color: isActive ? 'var(--bg-canvas)' : isDone ? 'var(--accent)' : 'var(--text-muted)',
                border: isActive ? 'none' : isDone ? '1px solid var(--accent-border)' : '1px solid var(--border-default)',
              }}>
                {isDone ? '\u2713' : stepNum}
              </div>
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)',
              }}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function EvidenceWizardPage() {
  const { tenantId } = useTenant();
  const [step, setStep] = useState(1);
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clauses, setClauses] = useState<RegulationClause[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);

  const selectedReg = REGULATIONS.find(r => r.id === selectedRegulation);

  /* ── Handlers ── */

  const selectRegulation = (reg: Regulation) => {
    setSelectedRegulation(reg);
    setStep(2);
  };

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const fetchPreview = async () => {
    if (!selectedRegulation) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const headers: Record<string, string> = {};
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch(`/api/v1/compliance/regulations?regulation=${selectedRegulation}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch regulation clauses');
      const data = await res.json();
      const regInfo: RegulationInfo | undefined = data.regulations?.find(
        (r: RegulationInfo) => r.regulation === selectedRegulation,
      );
      setClauses(regInfo?.clauses ?? []);
      setStep(3);
    } catch (err: any) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const generateBundle = async () => {
    if (!selectedRegulation || !startDate || !endDate) return;
    setGenerating(true);
    setGenerateError(null);
    setStep(4);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch('/api/v1/compliance/evidence-export', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          regulation: selectedRegulation,
          date_range: { start: startDate, end: endDate },
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Generation failed');
      }
      const data = await res.json();
      setResult(data);
      setStep(5);
    } catch (err: any) {
      setGenerateError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.evidence_manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-${result.regulation}-${result.export_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!result) return;
    window.open(`/api/v1/compliance/reports/${result.export_id}/pdf`, '_blank');
  };

  const restart = () => {
    setStep(1);
    setSelectedRegulation(null);
    setStartDate('');
    setEndDate('');
    setClauses([]);
    setResult(null);
    setGenerateError(null);
    setPreviewError(null);
  };

  /* ── Coverage score color ── */
  const scoreColor = (score: number) =>
    score > 80 ? 'var(--success)' : score > 50 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ maxWidth: '1000px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Evidence Wizard</h1>
          <p className="page-description">
            Generate regulation-mapped evidence bundles with cryptographic attestation.
          </p>
        </div>
        <Link
          href="/compliance/evidence/history"
          className="btn btn-outline"
          style={{ fontSize: '0.8125rem', textDecoration: 'none' }}
        >
          View History
        </Link>
      </div>

      <StepIndicator current={step} total={5} />

      {/* ── Step 1: Select Regulation ─────────────────────────────── */}
      {step === 1 && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Select the regulation to generate evidence for:
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {REGULATIONS.map(reg => (
              <div
                key={reg.id}
                className="surface"
                onClick={() => selectRegulation(reg.id)}
                style={{
                  cursor: 'pointer',
                  transition: 'background var(--t-fast), border-color var(--t-fast)',
                  outline: selectedRegulation === reg.id ? '2px solid var(--accent-border)' : 'none',
                  outlineOffset: '-2px',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
              >
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {reg.name}
                    </span>
                    <span className="badge badge-accent">{reg.clauses} clauses</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 0 }}>
                    {reg.description}
                  </p>
                </div>
              </div>
            ))}
            {/* Placeholder for future regulations */}
            <div
              className="surface"
              style={{ opacity: 0.4, pointerEvents: 'none' }}
            >
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    NIST AI RMF
                  </span>
                  <span className="badge badge-neutral">Coming Soon</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 0 }}>
                  NIST AI Risk Management Framework support is planned for a future release.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Date Range ────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Select the evidence collection period for <strong style={{ color: 'var(--text-primary)' }}>{selectedReg?.name}</strong>:
          </p>

          <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p.days}
                className="btn btn-outline"
                onClick={() => applyPreset(p.days)}
                style={{ fontSize: '0.8125rem' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div className="form-field">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ maxWidth: '200px' }}
              />
            </div>
            <div className="form-field">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ maxWidth: '200px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ fontSize: '0.8125rem' }}>
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={fetchPreview}
              disabled={!startDate || !endDate || previewLoading}
              style={{ fontSize: '0.8125rem', opacity: (!startDate || !endDate) ? 0.5 : 1 }}
            >
              {previewLoading ? 'Loading...' : 'Next'}
            </button>
          </div>
          {previewError && (
            <div className="callout callout-danger" style={{ marginTop: '1rem' }}>
              {previewError}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Preview Coverage ─────────────────────────────── */}
      {step === 3 && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Coverage preview for <strong style={{ color: 'var(--text-primary)' }}>{selectedReg?.name}</strong> ({startDate} to {endDate}):
          </p>

          {clauses.length > 0 ? (
            <div className="surface" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div className="panel-header">
                <span className="panel-title">Clauses ({clauses.length})</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Clause</th>
                      <th>Title</th>
                      <th>Evidence Sources</th>
                      <th>Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clauses.map(c => (
                      <tr key={c.clause_ref}>
                        <td>
                          <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {c.clause_ref}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {c.clause_title}
                          </span>
                        </td>
                        <td>
                          {c.evidence_sources?.length > 0 ? (
                            <span className="badge badge-success">
                              {c.evidence_sources.length} source{c.evidence_sources.length !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="badge badge-warning">None</span>
                          )}
                        </td>
                        <td>
                          {c.required_for_coverage ? (
                            <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>Required</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Optional</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ marginBottom: '1.5rem' }}>
              <p className="empty-state-title">No clauses found</p>
              <p className="empty-state-body">
                No regulation clauses have been mapped yet. The bundle will still be generated with available evidence.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)} style={{ fontSize: '0.8125rem' }}>
              Back
            </button>
            <button className="btn btn-primary" onClick={generateBundle} style={{ fontSize: '0.8125rem' }}>
              Generate Evidence Bundle
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Generating ───────────────────────────────────── */}
      {step === 4 && (
        <div>
          {generating ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{
                width: 40,
                height: 40,
                border: '3px solid var(--border-default)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1.5rem',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                Generating Evidence Bundle
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Collecting evidence, computing coverage, and signing attestation...
              </p>
            </div>
          ) : generateError ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div className="callout callout-danger" style={{ maxWidth: '500px', margin: '0 auto 1.5rem', textAlign: 'left' }}>
                {generateError}
              </div>
              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setStep(3)} style={{ fontSize: '0.8125rem' }}>
                  Back
                </button>
                <button className="btn btn-primary" onClick={generateBundle} style={{ fontSize: '0.8125rem' }}>
                  Retry
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Step 5: Results ──────────────────────────────────────── */}
      {step === 5 && result && (
        <div>
          {/* Coverage score */}
          {result.coverage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              marginBottom: '1.75rem',
              padding: '1.5rem',
              background: 'var(--bg-surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  color: scoreColor(result.coverage.overall_score),
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}>
                  {result.coverage.overall_score}%
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.375rem', letterSpacing: '0.06em' }}>
                  Coverage Score
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="kpi-label">Clauses Covered</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {result.coverage.clauses_covered} / {result.coverage.clauses_total}
                    </div>
                  </div>
                  <div>
                    <span className="kpi-label">Gaps</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: result.coverage.gaps.length > 0 ? 'var(--warning)' : 'var(--success)' }}>
                      {result.coverage.gaps.length}
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{
                  height: '4px',
                  background: 'var(--border-subtle)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${result.coverage.overall_score}%`,
                    background: scoreColor(result.coverage.overall_score),
                    borderRadius: '2px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Gap breakdown */}
          {result.coverage && result.coverage.gaps.length > 0 && (
            <div className="surface" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div className="panel-header">
                <span className="panel-title">Coverage Gaps</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Clause</th>
                      <th>Status</th>
                      <th>Remediation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.coverage.gaps.map(gap => (
                      <tr key={gap.clause_ref}>
                        <td>
                          <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {gap.clause_ref}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${gap.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                            {gap.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {gap.remediation_hint}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '0.625rem',
            padding: '1.25rem',
            background: 'var(--bg-surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
          }}>
            <button className="btn btn-primary" onClick={downloadJson} style={{ fontSize: '0.8125rem' }}>
              Download JSON
            </button>
            <button className="btn btn-outline" onClick={downloadPdf} style={{ fontSize: '0.8125rem' }}>
              Download PDF
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost" onClick={restart} style={{ fontSize: '0.8125rem' }}>
              Generate Another
            </button>
          </div>

          {/* Bundle metadata */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap',
            fontSize: '0.75rem',
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.625rem', letterSpacing: '0.06em' }}>Bundle ID</span>
              <div className="mono" style={{ color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{result.export_id}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.625rem', letterSpacing: '0.06em' }}>Regulation</span>
              <div style={{ color: 'var(--text-primary)', marginTop: '0.125rem' }}>{selectedReg?.name}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.625rem', letterSpacing: '0.06em' }}>Period</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{startDate} \u2192 {endDate}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.625rem', letterSpacing: '0.06em' }}>Status</span>
              <div style={{ marginTop: '0.125rem' }}>
                <span className="badge badge-success">{result.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

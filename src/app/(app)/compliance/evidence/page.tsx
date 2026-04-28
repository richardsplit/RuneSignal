'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenant } from '@lib/contexts/TenantContext';
import {
  Regulation, RegulationClause, RegulationInfo, ExportResult, AgentOption,
  REGULATIONS, PRESETS, MOCK_CLAUSES,
} from '@/components/features/compliance/evidence-types';
import { StepIndicator } from '@/components/features/compliance/StepIndicator';

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function EvidenceWizardPage() {
  const { tenantId } = useTenant();
  const [step, setStep] = useState(1);

  // Step 1: agent selection
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [agentScope, setAgentScope] = useState<'all' | 'selected'>('all');

  // Steps 2–6
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clauses, setClauses] = useState<RegulationClause[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [livePreview, setLivePreview] = useState<{ overall_score: number; clauses_covered: number; clauses_total: number; gaps: Array<{ clause_ref: string; status: string; remediation_hint: string }>; hitl_count: number; control_count: number } | null>(null);
  const [livePreviewLoading, setLivePreviewLoading] = useState(false);

  const selectedReg = REGULATIONS.find(r => r.id === selectedRegulation);

  /* ── Fetch agents on mount ── */
  useEffect(() => {
    async function loadAgents() {
      setAgentsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (tenantId) headers['X-Tenant-Id'] = tenantId;
        const res = await fetch('/api/v1/agents', { headers });
        if (res.ok) {
          const data = await res.json();
          setAgents((data.agents || []).filter((a: AgentOption) => a.status === 'active'));
        }
      } catch { /* silently fallback to empty */ }
      finally { setAgentsLoading(false); }
    }
    loadAgents();
  }, [tenantId]);

  /* ── Handlers ── */

  const toggleAgent = (id: string) => {
    setSelectedAgentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectRegulation = (reg: Regulation) => {
    setSelectedRegulation(reg);
    setStep(3);
  };

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const resolvedAgentIds = agentScope === 'all'
    ? agents.map(a => a.id)
    : Array.from(selectedAgentIds);

  const fetchPreview = async () => {
    if (!selectedRegulation || !startDate || !endDate) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setLivePreview(null);
    try {
      const headers: Record<string, string> = {};
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const [regRes] = await Promise.all([
        fetch(`/api/v1/compliance/regulations?regulation=${selectedRegulation}`, { headers }),
      ]);
      if (!regRes.ok) throw new Error('api_error');
      const data = await regRes.json();
      const regInfo: RegulationInfo | undefined = data.regulations?.find(
        (r: RegulationInfo) => r.regulation === selectedRegulation,
      );
      setClauses(regInfo?.clauses ?? MOCK_CLAUSES[selectedRegulation]);
      setStep(4);
      // Fire live coverage preview async (non-blocking)
      if (tenantId) {
        setLivePreviewLoading(true);
        fetch(
          `/api/v1/compliance/evidence-preview?regulation=${selectedRegulation}&start=${startDate}&end=${endDate}`,
          { headers: { 'X-Tenant-Id': tenantId } },
        )
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setLivePreview({ ...d.coverage, hitl_count: d.hitl_count, control_count: d.control_count }); })
          .catch(() => {})
          .finally(() => setLivePreviewLoading(false));
      }
    } catch {
      setClauses(MOCK_CLAUSES[selectedRegulation]);
      setStep(4);
    } finally {
      setPreviewLoading(false);
    }
  };

  const generateBundle = async () => {
    if (!selectedRegulation || !startDate || !endDate) return;
    setGenerating(true);
    setGenerateError(null);
    setStep(5);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch('/api/v1/compliance/evidence-export', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          regulation: selectedRegulation,
          date_range: { start: startDate, end: endDate },
          agent_ids: agentScope === 'selected' ? Array.from(selectedAgentIds) : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Generation failed');
      }
      const data = await res.json();
      setResult(data);
      setStep(6);
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
    setAgentScope('all');
    setSelectedAgentIds(new Set());
    setLivePreview(null);
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

      <StepIndicator current={Math.min(step, 5)} total={5} />

      {/* ── Step 1: Select Agents ─────────────────────────────────── */}
      {step === 1 && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Choose which agents to include in the evidence scope:
          </p>

          {/* Scope toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              className={`btn ${agentScope === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setAgentScope('all')}
              style={{ fontSize: '0.8125rem' }}
            >
              All Active Agents
            </button>
            <button
              className={`btn ${agentScope === 'selected' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setAgentScope('selected')}
              style={{ fontSize: '0.8125rem' }}
            >
              Select Specific Agents
            </button>
          </div>

          {agentScope === 'selected' && (
            <div className="surface" style={{ overflow: 'hidden', marginBottom: '1.25rem' }}>
              <div className="panel-header">
                <span className="panel-title">Active Agents</span>
                {selectedAgentIds.size > 0 && (
                  <span className="badge badge-accent">{selectedAgentIds.size} selected</span>
                )}
              </div>
              {agentsLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Loading agents…</div>
              ) : agents.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>No active agents found. Evidence will include all tenant data.</div>
              ) : (
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Agent</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(a => (
                      <tr
                        key={a.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleAgent(a.id)}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedAgentIds.has(a.id)}
                            onChange={() => toggleAgent(a.id)}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.agent_name}</div>
                          <div className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{a.id}</div>
                        </td>
                        <td><span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{a.agent_type}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {agentScope === 'all' && (
            <div style={{ padding: '1rem 1.25rem', background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Evidence will be collected for <strong style={{ color: 'var(--text-primary)' }}>all {agents.length > 0 ? agents.length : ''} active agents</strong> in your tenant.
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={() => setStep(2)}
            disabled={agentScope === 'selected' && selectedAgentIds.size === 0}
            style={{ fontSize: '0.8125rem', opacity: agentScope === 'selected' && selectedAgentIds.size === 0 ? 0.5 : 1 }}
          >
            Next: Select Regulation →
          </button>
        </div>
      )}

      {/* ── Step 2: Select Regulation ─────────────────────────────── */}
      {step === 2 && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Select the regulation to generate evidence for:
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {REGULATIONS.map((reg: { id: Regulation; name: string; description: string; clauses: number }) => (
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
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
              >
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {reg.name}
                    </span>
                    <span className="badge badge-accent">{reg.clauses} clauses</span>
                  </div>
                  <p className="t-caption" style={{ lineHeight: 1.5, marginBottom: 0 }}>
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
                  <span className="text-tertiary" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                    NIST AI RMF
                  </span>
                  <span className="badge badge-neutral">Coming Soon</span>
                </div>
                <p className="t-caption" style={{ lineHeight: 1.5, marginBottom: 0 }}>
                  NIST AI Risk Management Framework support is planned for a future release.
                </p>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ fontSize: '0.8125rem' }}>
              ← Back to Agents
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Date Range ────────────────────────────────────── */}
      {step === 3 && (
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
            <button className="btn btn-ghost" onClick={() => setStep(2)} style={{ fontSize: '0.8125rem' }}>
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

      {/* ── Step 4: Preview Coverage ─────────────────────────────── */}
      {step === 4 && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Coverage preview for <strong style={{ color: 'var(--text-primary)' }}>{selectedReg?.name}</strong> ({startDate} to {endDate}):
          </p>

          {/* ── Live coverage score card ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.25rem',
          }}>
            {livePreviewLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                <div style={{ width: 16, height: 16, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                Computing live coverage…
              </div>
            ) : livePreview ? (
              <>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: scoreColor(livePreview.overall_score), lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {livePreview.overall_score}%
                  </div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.25rem' }}>
                    Live Score
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-subtle)', height: 40, flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Clauses</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{livePreview.clauses_covered} / {livePreview.clauses_total}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gaps</div>
                    <div style={{ fontWeight: 600, color: livePreview.gaps.length > 0 ? 'var(--warning)' : 'var(--success)' }}>{livePreview.gaps.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>HITL Receipts</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{livePreview.hitl_count}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Passing Controls</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{livePreview.control_count}</div>
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>Dry-run · not saved</span>
              </>
            ) : (
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Live score unavailable — connect tenant to compute.</span>
            )}
          </div>

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
                          <span className="t-mono" style={{ color: 'var(--text-secondary)' }}>{c.clause_ref}</span>
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
                            <span className="t-caption" style={{ color: 'var(--accent)' }}>Required</span>
                          ) : (
                            <span className="t-caption text-tertiary">Optional</span>
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
            <button className="btn btn-ghost" onClick={() => setStep(3)} style={{ fontSize: '0.8125rem' }}>
              Back
            </button>
            <button className="btn btn-primary" onClick={generateBundle} style={{ fontSize: '0.8125rem' }}>
              Generate Evidence Bundle
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Generating ───────────────────────────────────── */}
      {step === 5 && (
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
              <p className="t-body-sm text-tertiary">
                Collecting evidence, computing coverage, and signing attestation…
              </p>
            </div>
          ) : generateError ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div className="callout callout-danger" style={{ maxWidth: '500px', margin: '0 auto 1.5rem', textAlign: 'left' }}>
                {generateError}
              </div>
              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setStep(4)} style={{ fontSize: '0.8125rem' }}>
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

      {/* ── Step 6: Results ──────────────────────────────────────── */}
      {step === 6 && result && (
        <div>
          {/* Coverage score */}
          {result.coverage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              marginBottom: '1.75rem',
              padding: '1.5rem',
              background: 'var(--surface-1)',
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
                <div className="t-eyebrow" style={{ marginTop: '0.375rem' }}>
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
                          <span className="t-mono" style={{ color: 'var(--text-secondary)' }}>{gap.clause_ref}</span>
                        </td>
                        <td>
                          <span className={`badge ${gap.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                            {gap.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className="t-caption">{gap.remediation_hint}</span>
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
            background: 'var(--surface-1)',
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
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap',
            fontSize: '0.75rem',
          }}>
            <div>
              <span className="t-eyebrow">Bundle ID</span>
              <div className="t-mono" style={{ color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{result.export_id}</div>
            </div>
            <div>
              <span className="t-eyebrow">Regulation</span>
              <div style={{ color: 'var(--text-primary)', marginTop: '0.125rem' }}>{selectedReg?.name}</div>
            </div>
            <div>
              <span className="t-eyebrow">Period</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{startDate} \u2192 {endDate}</div>
            </div>
            <div>
              <span className="t-eyebrow">Status</span>
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


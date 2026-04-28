'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useTenant } from '@lib/contexts/TenantContext';
import { AgentRiskProfile, ApiError } from '@/lib/api';

// InsuranceClaim type kept locally — S5 insurance is admin-gated and not
// exported from the public API client.
interface InsuranceClaim {
  id: string;
  tenant_id: string;
  agent_id: string;
  incident_type: string;
  financial_impact: number;
  description: string;
  status: 'filed' | 'investigating' | 'approved' | 'denied';
  filed_at: string;
  resolved_at?: string;
}
import { ApiErrorBanner, SkeletonTable } from '@/components/Skeleton';

/* ─── Demo fallback ──────────────────────────────────────────────────── */
const DEMO_PROFILES: AgentRiskProfile[] = [
  { id: 'rp-001', tenant_id: 'demo', agent_id: 'agt-001', risk_score: 5,  total_violations: 0,  hitl_escalations: 0,  model_version_anomalies: 0, last_computed_at: new Date().toISOString(), agent_credentials: { agent_name: 'InventoryManager' } },
  { id: 'rp-002', tenant_id: 'demo', agent_id: 'agt-002', risk_score: 25, total_violations: 2,  hitl_escalations: 7,  model_version_anomalies: 0, last_computed_at: new Date().toISOString(), agent_credentials: { agent_name: 'ContractAnalyst'  } },
  { id: 'rp-003', tenant_id: 'demo', agent_id: 'agt-003', risk_score: 95, total_violations: 14, hitl_escalations: 2,  model_version_anomalies: 1, last_computed_at: new Date().toISOString(), agent_credentials: { agent_name: 'SlackBot_Dev'      } },
  { id: 'rp-004', tenant_id: 'demo', agent_id: 'agt-004', risk_score: 45, total_violations: 4,  hitl_escalations: 12, model_version_anomalies: 0, last_computed_at: new Date().toISOString(), agent_credentials: { agent_name: 'CustomerSupport'   } },
];
const DEMO_CLAIMS: InsuranceClaim[] = [
  { id: 'clm-8921', tenant_id: 'demo', agent_id: 'agt-003', incident_type: 'Data Exfiltration Violation', financial_impact: 12500, description: 'Attempted exfiltration via unmonitored channel.', status: 'investigating', filed_at: new Date(Date.now() - 172800000).toISOString() },
];

/* ─── Premium calculation (mirrors the backend risk engine) ─────────── */
function calcPremium(profile: AgentRiskProfile): number {
  const base = 500;
  const multiplier = 1 + profile.risk_score / 100 * 2;
  return Math.round(base * multiplier);
}

/* ─── Risk score display ─────────────────────────────────────────────── */
function RiskGauge({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--danger)' : score >= 40 ? 'var(--warning)' : score >= 15 ? 'var(--info)' : 'var(--success)';
  const label = score >= 80 ? 'Critical' : score >= 40 ? 'Elevated' : score >= 15 ? 'Moderate' : 'Low';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
      <div style={{ width: '48px', height: '4px', background: 'var(--border-default)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', minWidth: '22px' }}>{score}</span>
      <span className="t-caption">{label}</span>
    </div>
  );
}

const CLAIM_STATUS: Record<InsuranceClaim['status'], { cls: string; label: string }> = {
  filed:         { cls: 'badge badge-info',    label: 'Filed'         },
  investigating: { cls: 'badge badge-warning', label: 'Investigating' },
  approved:      { cls: 'badge badge-success', label: 'Approved'      },
  denied:        { cls: 'badge badge-danger',  label: 'Denied'        },
};

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function InsurancePage() {
  const { showToast } = useToast();
  const { tenantId } = useTenant();

  const [profiles, setProfiles] = useState<AgentRiskProfile[]>([]);
  const [claims,   setClaims]   = useState<InsuranceClaim[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [isDemo,   setIsDemo]   = useState(false);
  const [tab,      setTab]      = useState<'profiles' | 'claims' | 'carrier'>('profiles');
  const [generatingPack, setGeneratingPack] = useState(false);
  const [lastPack, setLastPack] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // S5 Insurance is admin-gated — API client methods removed from public surface.
      // Always show demo data. Live data requires direct API access.
      throw new Error('Insurance module is admin-gated');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Network error';
      setError(msg);
      setProfiles(DEMO_PROFILES);
      setClaims(DEMO_CLAIMS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalCoverage    = 5_000_000;
  const monthlyPremium   = profiles.reduce((s, p) => s + calcPremium(p), 0);
  const avgRisk          = profiles.length ? Math.round(profiles.reduce((s, p) => s + p.risk_score, 0) / profiles.length) : 0;
  const activeClaims     = claims.filter(c => c.status === 'investigating' || c.status === 'filed').length;

  const handleRecalculate = async () => {
    if (!tenantId) return;
    showToast('Triggering fleet-wide risk recalculation...', 'info');
    
    try {
      const res = await fetch('/api/v1/insurance/risk', {
        method: 'POST',
        headers: { 'X-Tenant-Id': tenantId }
      });
      if (res.ok) {
        showToast('Actuarial refresh complete.', 'success');
        load(); // Refresh data after recalculation
      } else {
        showToast('Risk calculation failed.', 'error');
      }
    } catch (e) {
      showToast('Risk calculation failed due to network error.', 'error');
      console.error('Risk recalculation failed:', e);
    }
  };

  // Metrics calculation
  const totalLiabilities = "$5,000,000"; // Based on policy limit
  const fleetAvgRisk = profiles.length > 0 
    ? Math.round(profiles.reduce((acc, p) => acc + p.risk_score, 0) / profiles.length) 
    : 0;
  
  const calculateTotalPremium = () => {
    const base = 500;
    const total = profiles.reduce((acc, p) => {
      let m = 1.0;
      if (p.risk_score > 10) m = 1.2;
      if (p.risk_score > 30) m = 1.5;
      if (p.risk_score > 60) m = 2.0;
      if (p.risk_score > 90) m = 3.0;
      return acc + (base * m);
    }, 0);
    return total.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p>Loading insurance data...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Risk & Insurance</h1>
          <p className="page-description">Actuarial risk modeling, dynamic premiums, and AI liability coverage.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => showToast('Opening Coverage Policy (PDF)...')}>Coverage Policy</button>
          <button className="btn btn-primary" onClick={() => showToast('Redirecting to Claims Filing Portal...', 'info')}>File Claim</button>
        </div>
      </div>

      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Total Coverage',      value: `$${totalCoverage.toLocaleString()}`, color: undefined },
          { label: 'Fleet Avg Risk Score', value: `${avgRisk} / 100`,                  color: avgRisk >= 50 ? 'var(--warning)' : undefined },
          { label: 'Monthly Premium',      value: `$${monthlyPremium.toLocaleString()}`, color: 'var(--success)' },
          { label: 'Active Claims',        value: activeClaims,                         color: activeClaims > 0 ? 'var(--warning)' : undefined },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            {loading && i > 0
              ? <div className="skeleton-pulse" style={{ height: 28, width: '40%', borderRadius: 'var(--radius-xs)', marginTop: 2 }} />
              : <div className="kpi-value" style={k.color ? { color: k.color as string } : undefined}>{k.value}</div>
            }
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {(['profiles', 'claims', 'carrier'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab${tab === t ? ' active' : ''}`}>
            {t === 'profiles' ? 'Agent Risk Profiles' : t === 'claims' ? `Claims (${claims.length})` : '🔏 Carrier Evidence Pack'}
          </button>
        ))}
      </div>

      {/* Risk profiles */}
      {tab === 'profiles' && (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Agent Risk Profiles</span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
              onClick={() => { load(); showToast('Triggering actuarial recalculation...'); }}
            >
              Coverage Policy
            </button>
            <button className="btn btn-primary" onClick={() => showToast('Opening claim filing form...')}>File Claim</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Risk Score</th>
                <th>Violations</th>
                <th>HITL Events</th>
                <th>Anomalies</th>
                <th>Last Updated</th>
                <th style={{ textAlign: 'right' }}>Monthly Premium</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={4} cols={['20%', '20%', '10%', '10%', '10%', '15%', '12%']} />
              ) : profiles.map(p => {
                const agentName = p.agent_credentials?.agent_name ?? p.agent_id;
                const premium   = calcPremium(p);
                const updated   = new Date(p.last_computed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                return (
                  <tr key={p.id} style={{
                    background: p.risk_score >= 80 ? 'var(--danger-soft)'
                              : p.risk_score >= 40 ? 'var(--warning-soft)'
                              : undefined,
                  }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{agentName}</div>
                      <div className="t-mono text-tertiary" style={{ fontSize: '0.6875rem', marginTop: '1px' }}>{p.agent_id}</div>
                    </td>
                    <td><RiskGauge score={p.risk_score} /></td>
                    <td style={{ color: p.total_violations > 0 ? 'var(--danger)' : 'var(--text-tertiary)', fontWeight: p.total_violations > 0 ? 600 : 400 }}>
                      {p.total_violations}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.hitl_escalations}</td>
                    <td style={{ color: p.model_version_anomalies > 0 ? 'var(--warning)' : 'var(--text-tertiary)' }}>
                      {p.model_version_anomalies}
                    </td>
                    <td className="text-tertiary t-body-sm">{updated}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="t-mono" style={{ fontWeight: 600, fontSize: '0.875rem' }}>${premium.toLocaleString()}</span>
                      <span className="t-caption" style={{ marginLeft: '0.25rem' }}>/mo</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Claims */}
      {tab === 'claims' && (
        <div className="surface" style={{ overflow: 'hidden' }}>
          {claims.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Agent</th>
                  <th>Incident Type</th>
                  <th>Impact</th>
                  <th>Status</th>
                  <th>Filed</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(c => {
                  const filed = new Date(c.filed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  return (
                    <tr key={c.id}>
                      <td><span className="t-mono text-tertiary">{c.id}</span></td>
                      <td><span style={{ fontWeight: 600 }}>{c.agent_id}</span></td>
                      <td style={{ fontSize: '0.8125rem' }}>{c.incident_type}</td>
                      <td>
                        <span className="t-mono" style={{ fontWeight: 700 }}>${c.financial_impact.toLocaleString()}</span>
                      </td>
                      <td><span className={CLAIM_STATUS[c.status].cls}>{CLAIM_STATUS[c.status].label}</span></td>
                      <td className="text-tertiary t-body-sm">{filed}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                          onClick={() => showToast(`Opening claim detail for ${c.id}...`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">No active claims</p>
              <p className="empty-state-body">Fleet is operating within policy bounds.</p>
            </div>
          )}
        </div>
      )}

      {/* Carrier Evidence Pack export */}
      {tab === 'carrier' && (
        <div className="surface" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem' }}>Insurance Carrier Evidence Pack</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Generate a carrier-ready evidence pack from your live audit trail. Includes loss-event sampling, anomaly rates, HITL coverage, and reversal history. One-click export for AI-liability policy underwriting.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
            {[
              { icon: '📊', label: 'Loss-Event Sampling', desc: 'Anomaly + incident sampling per standard carrier template' },
              { icon: '✅', label: 'HITL Coverage Rate', desc: 'Human oversight % across all decisions' },
              { icon: '↩️', label: 'Reversal History', desc: 'All reversed decisions with orchestration log' },
              { icon: '🔏', label: 'Cryptographic Signature', desc: 'Ed25519-signed, append-only, tamper-evident' },
            ].map(item => (
              <div key={item.label} style={{ padding: '0.875rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.375rem' }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
          {lastPack && (
            <div style={{ padding: 'var(--space-4)', background: 'var(--success-soft)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--success)' }}>✓ Pack generated</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.125rem' }}>Coverage score: {(lastPack as any).coverage_score}% · Hash: {String((lastPack as any).manifest_hash ?? '').slice(0, 16)}…</div>
              </div>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => {
                const blob = new Blob([JSON.stringify(lastPack, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
                a.download = `carrier-evidence-pack-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
              }}>Download JSON</button>
            </div>
          )}
          <button className="btn btn-primary" disabled={generatingPack} onClick={async () => {
            if (!tenantId) return;
            setGeneratingPack(true);
            try {
              const res = await fetch('/api/v1/insurance/claim-pack', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId }, body: JSON.stringify({ carrier: 'General', created_by: 'dashboard' }) });
              const d = await res.json();
              if (!res.ok) { showToast(d.error ?? 'Generation failed', 'error'); return; }
              setLastPack(d.pack);
              showToast('Carrier evidence pack generated and signed', 'success');
            } catch { showToast('Generation failed', 'error'); }
            finally { setGeneratingPack(false); }
          }}>
            {generatingPack ? 'Generating…' : '🔏 Generate Carrier Pack (Last 90 days)'}
          </button>
        </div>
      )}

      {/* Footer meta */}
      {!loading && (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="status-dot" style={{ background: isDemo ? 'var(--warning)' : 'var(--success)' }} />
          <span className="t-caption">
            {isDemo ? 'Demo data — connect Supabase for live risk profiles' : `${profiles.length} profiles loaded from API`}
          </span>
        </div>
      )}
    </div>
  );
}


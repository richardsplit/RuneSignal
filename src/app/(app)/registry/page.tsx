'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTenant } from '@lib/contexts/TenantContext';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface AgentPassport {
  id: string;
  agent_id: string;
  passport_number: string;
  status: 'active' | 'suspended' | 'revoked';
  agent_name: string;
  agent_type: string | null;
  framework: string;
  capabilities: string[];
  risk_tier: string;
  eu_ai_act_category: string | null;
  reputation_score: number;
  incident_count: number;
  anomaly_count: number;
  signature: string;
  signed_at: string;
  valid_from: string;
  valid_to: string | null;
  revoked_at: string | null;
  public: boolean;
  created_at: string;
}

interface AgentOption {
  id: string;
  agent_name: string;
  agent_type: string;
  status: string;
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'var(--success)' },
  suspended: { label: 'Suspended', color: '#f59e0b' },
  revoked:   { label: 'Revoked',   color: '#ef4444' },
};

const RISK_META: Record<string, { label: string; color: string }> = {
  prohibited:   { label: 'Prohibited',   color: '#ef4444' },
  high_risk:    { label: 'High Risk',    color: '#f59e0b' },
  limited_risk: { label: 'Limited Risk', color: '#60a5fa' },
  minimal_risk: { label: 'Minimal Risk', color: 'var(--success)' },
  unclassified: { label: 'Unclassified', color: 'var(--text-muted)' },
};

function reputationColor(score: number): string {
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

/* ─── Issue Passport Modal ───────────────────────────────────────────── */
function IssueModal({ tenantId, onClose, onSuccess }: { tenantId: string | null; onClose: () => void; onSuccess: () => void }) {
  const [agents, setAgents]       = useState<AgentOption[]>([]);
  const [agentId, setAgentId]     = useState('');
  const [agentName, setAgentName] = useState('');
  const [framework, setFramework] = useState('runesignal');
  const [isPublic, setIsPublic]   = useState(false);
  const [validDays, setValidDays] = useState(365);
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState<string | null>(null);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-Id'] = tenantId;
    fetch('/api/v1/agents', { headers })
      .then(r => r.ok ? r.json() : { agents: [] })
      .then(d => setAgents(d.agents ?? []))
      .catch(() => {});
  }, [tenantId]);

  const handleAgentSelect = (id: string) => {
    setAgentId(id);
    const a = agents.find(a => a.id === id);
    if (a) setAgentName(a.agent_name);
  };

  const handleIssue = async () => {
    if (!agentId) { setErr('Select an agent'); return; }
    setSaving(true); setErr(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch('/api/v1/registry/passports', {
        method: 'POST', headers,
        body: JSON.stringify({ agent_id: agentId, agent_name: agentName, framework, public: isPublic, valid_days: validDays }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      onSuccess();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div className="surface" style={{ width: '100%', maxWidth: 440, padding: '1.5rem', borderRadius: 12 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>Issue Agent Passport</h3>

        {[
          { label: 'AGENT', el: agents.length > 0
            ? <select value={agentId} onChange={e => handleAgentSelect(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                <option value="">Select agent…</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.agent_name}</option>)}
              </select>
            : <input value={agentId} onChange={e => setAgentId(e.target.value)} placeholder="Agent ID" style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          },
          { label: 'FRAMEWORK', el: <select value={framework} onChange={e => setFramework(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
            <option value="runesignal">RuneSignal</option>
            <option value="spiffe">SPIFFE</option>
            <option value="w3c_vc">W3C Verifiable Credential</option>
          </select> },
          { label: 'VALIDITY', el: <select value={validDays} onChange={e => setValidDays(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>1 year</option>
            <option value={730}>2 years</option>
          </select> },
        ].map(({ label, el }) => (
          <div key={label} style={{ marginBottom: '0.875rem' }}>
            <label style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>{label}</label>
            {el}
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <input type="checkbox" id="public" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
          <label htmlFor="public" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            List in public registry (counterparties can discover and verify)
          </label>
        </div>

        {err && <div style={{ padding: '0.5rem 0.75rem', background: '#ef444415', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{err}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleIssue} disabled={saving}>{saving ? 'Issuing…' : 'Issue Passport'}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function RegistryPage() {
  const { tenantId } = useTenant();
  const [passports, setPassports]   = useState<AgentPassport[]>([]);
  const [publicReg, setPublicReg]   = useState<AgentPassport[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showIssue, setShowIssue]   = useState(false);
  const [tab, setTab]               = useState<'mine' | 'browse'>('mine');
  const [revoking, setRevoking]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const headers: Record<string, string> = {};
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const [myRes, pubRes] = await Promise.all([
        fetch('/api/v1/registry/passports', { headers }),
        fetch('/api/v1/registry/passports?browse=true', { headers }),
      ]);
      if (myRes.ok)  { const d = await myRes.json();  setPassports(d.passports ?? []); }
      if (pubRes.ok) { const d = await pubRes.json(); setPublicReg(d.passports ?? []); }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this passport? This cannot be undone.')) return;
    setRevoking(id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      await fetch(`/api/v1/registry/passports/${id}/revoke`, { method: 'POST', headers, body: JSON.stringify({ reason: 'Manually revoked from dashboard' }) });
      await load();
    } catch { /* ignore */ }
    finally { setRevoking(null); }
  };

  const handleVerify = async (id: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch(`/api/v1/registry/passports/${id}/verify`, { method: 'POST', headers });
      const d = await res.json();
      alert(`Verification result: ${d.verification?.result?.toUpperCase() ?? 'ERROR'}\nAgent: ${d.verification?.agent_name}\nReputation: ${d.verification?.reputation_score}`);
    } catch { /* ignore */ }
  };

  const list = tab === 'mine' ? passports : publicReg;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Agent Passport Registry</h1>
          <p className="page-description">Issue, verify, and revoke signed Agent Passports. Counterparties verify via API. Public registry enables cross-org trust.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowIssue(true)} style={{ flexShrink: 0 }}>+ Issue Passport</button>
      </div>

      {/* KPIs */}
      <div className="kpi-strip" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'My Passports',  value: passports.length },
          { label: 'Active',        value: passports.filter(p => p.status === 'active').length,   color: 'var(--success)' },
          { label: 'Public',        value: passports.filter(p => p.public).length,                 color: '#3b82f6' },
          { label: 'Revoked',       value: passports.filter(p => p.status === 'revoked').length,   color: '#ef4444' },
          { label: 'Public Registry', value: publicReg.length,                                      color: '#a78bfa' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{loading ? '…' : k.value}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ padding: '0.75rem', background: '#ef444415', border: '1px solid #ef444433', borderRadius: 8, color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {[{ key: 'mine', label: `My Passports (${passports.length})` }, { key: 'browse', label: `Browse Public Registry (${publicReg.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: '0.625rem 1.25rem', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', fontSize: '0.875rem', fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Passport cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton-pulse" style={{ height: 96, borderRadius: 8 }} />)}
        </div>
      ) : list.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 8 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🛂</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
            {tab === 'mine' ? 'No passports issued yet' : 'No public agents in registry'}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {tab === 'mine' ? 'Issue a signed passport to register an agent\'s identity and capabilities.' : 'Agents become visible here when their owners set them as public.'}
          </div>
          {tab === 'mine' && <button className="btn btn-primary" onClick={() => setShowIssue(true)}>Issue First Passport</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.map(p => {
            const statusMeta = STATUS_META[p.status] ?? STATUS_META.active;
            const riskMeta   = RISK_META[p.risk_tier] ?? RISK_META.unclassified;
            return (
              <div key={p.id} className="surface" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

                {/* Reputation */}
                <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: '50%', border: `3px solid ${reputationColor(p.reputation_score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: reputationColor(p.reputation_score), lineHeight: 1 }}>{Math.round(p.reputation_score)}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>rep</span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{p.agent_name}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: statusMeta.color, padding: '0.125rem 0.5rem', borderRadius: 999, background: `${statusMeta.color}18`, border: `1px solid ${statusMeta.color}33` }}>{statusMeta.label}</span>
                    <span style={{ fontSize: '0.6875rem', color: riskMeta.color, padding: '0.125rem 0.5rem', borderRadius: 999, background: `${riskMeta.color}18`, border: `1px solid ${riskMeta.color}33` }}>{riskMeta.label}</span>
                    {p.public && <span style={{ fontSize: '0.6875rem', color: '#3b82f6', padding: '0.125rem 0.5rem', borderRadius: 999, background: '#3b82f615', border: '1px solid #3b82f633' }}>🌐 Public</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span className="mono" style={{ fontSize: '0.6875rem' }}>{p.passport_number}</span>
                    {' · '}Framework: {p.framework}
                    {' · '}Valid until: {p.valid_to ? new Date(p.valid_to).toLocaleDateString('en-GB') : '—'}
                    {' · '}Issued {relativeTime(p.created_at)}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }} onClick={() => handleVerify(p.id)}>Verify</button>
                  {tab === 'mine' && p.status === 'active' && (
                    <button className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }} onClick={() => handleRevoke(p.id)} disabled={revoking === p.id}>
                      {revoking === p.id ? '…' : 'Revoke'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showIssue && (
        <IssueModal tenantId={tenantId} onClose={() => setShowIssue(false)} onSuccess={() => { setShowIssue(false); load(); }} />
      )}
    </div>
  );
}

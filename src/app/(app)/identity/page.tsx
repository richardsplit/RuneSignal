'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { agents as agentsApi, AgentCredential, ApiError } from '@/lib/api';
import { ApiErrorBanner, SkeletonTable } from '@/components/Skeleton';
import AgentRegistrationModal from '@/components/features/identity/AgentRegistrationModal';

/* ─── Demo fallback (used when API is unavailable) ───────────────────── */
const DEMO_AGENTS: AgentCredential[] = [
  { id: 'agt-001', tenant_id: 'demo', agent_name: 'InventoryManager', agent_type: 'langgraph',  status: 'active',    created_at: new Date(Date.now() - 86400000 * 2).toISOString(), last_seen_at: new Date(Date.now() - 120000).toISOString()  },
  { id: 'agt-002', tenant_id: 'demo', agent_name: 'ContractAnalyst',  agent_type: 'crewai',     status: 'active',    created_at: new Date(Date.now() - 86400000 * 5).toISOString(), last_seen_at: new Date(Date.now() - 3600000).toISOString()  },
  { id: 'agt-003', tenant_id: 'demo', agent_name: 'SlackBot_Dev',     agent_type: 'custom',     status: 'suspended', created_at: new Date(Date.now() - 86400000 * 10).toISOString(), last_seen_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'agt-004', tenant_id: 'demo', agent_name: 'CustomerSupport',  agent_type: 'custom',     status: 'active',    created_at: new Date(Date.now() - 86400000 * 3).toISOString(), last_seen_at: new Date(Date.now() - 300000).toISOString()   },
  { id: 'agt-005', tenant_id: 'demo', agent_name: 'DataPipeline',     agent_type: 'langgraph',  status: 'active',    created_at: new Date().toISOString(),                            last_seen_at: undefined                                     },
];

/* ─── Helpers ────────────────────────────────────────────────────────── */
function relativeTime(iso?: string): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

const STATUS_MAP: Record<AgentCredential['status'], { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'badge badge-success' },
  suspended: { label: 'Suspended', cls: 'badge badge-danger'  },
  revoked:   { label: 'Revoked',   cls: 'badge badge-neutral' },
};

const RISK_TIER_MAP: Record<string, { label: string; cls: string }> = {
  prohibited:    { label: 'Prohibited',    cls: 'badge badge-danger'   },
  high_risk:     { label: 'High Risk',     cls: 'badge badge-warning'  },
  limited_risk:  { label: 'Limited Risk',  cls: 'badge badge-info'     },
  minimal_risk:  { label: 'Minimal Risk',  cls: 'badge badge-success'  },
  unclassified:  { label: 'Unclassified',  cls: 'badge badge-neutral'  },
};

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function IdentityPage() {
  const { showToast } = useToast();

  const [data, setData]       = useState<AgentCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<'all' | AgentCredential['status']>('all');
  const [isDemo, setIsDemo]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await agentsApi.list();
      setData(res.agents);
      setIsDemo(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Network error';
      setError(msg);
      setData(DEMO_AGENTS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? data : data.filter(a => a.status === filter);
  const activeCount    = data.filter(a => a.status === 'active').length;
  const suspendedCount = data.filter(a => a.status === 'suspended').length;

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Agent Identity</h1>
          <p className="page-description">Manage registered AI agents, scoped credentials, and security manifests.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModalOpen(true)}
        >
          Register Agent
        </button>
      </div>

      {/* Error banner */}
      {error && <ApiErrorBanner message={error} onRetry={load} />}

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Total Agents', value: data.length,    color: undefined },
          { label: 'Active',       value: activeCount,    color: 'var(--success)'  },
          { label: 'Suspended',    value: suspendedCount, color: suspendedCount > 0 ? 'var(--warning)' : undefined },
          { label: 'Data source',  value: isDemo ? 'Demo' : 'Live', color: isDemo ? 'var(--warning)' : 'var(--success)' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            {loading
              ? <div className="skeleton-pulse" style={{ height: 28, width: '40%', borderRadius: 4, marginTop: 2 }} />
              : <div className="kpi-value" style={k.color ? { color: k.color } : undefined}>{k.value}</div>
            }
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title">Agent Fleet</span>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {(['all', 'active', 'suspended'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`chip${filter === f ? ' chip-accent' : ''}`}
                style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', textTransform: 'capitalize' }}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
          >
            Register New Agent
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Framework</th>
              <th>Status</th>
              <th>EU AI Act Tier</th>
              <th>Last Seen</th>
              <th>Registered</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={5} cols={['35%', '12%', '10%', '13%', '13%', '12%', '10%']} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No agents match the current filter.
                </td>
              </tr>
            ) : filtered.map(agent => {
              const { label, cls } = STATUS_MAP[agent.status];
              const registered = new Date(agent.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <tr key={agent.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{agent.agent_name}</div>
                    <div className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '1px' }}>{agent.id}</div>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, fontSize: '0.75rem' }}>
                      {agent.agent_type}
                    </span>
                  </td>
                  <td><span className={cls}>{label}</span></td>
                  <td>
                    {agent.eu_ai_act_category ? (
                      <span className={RISK_TIER_MAP[agent.eu_ai_act_category]?.cls || 'badge badge-neutral'}
                        style={{ fontSize: '0.65rem', textTransform: 'none', letterSpacing: 0 }}>
                        {RISK_TIER_MAP[agent.eu_ai_act_category]?.label || agent.eu_ai_act_category}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{relativeTime(agent.last_seen_at)}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{registered}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                      <Link
                        href={`/identity/${agent.id}`}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem', textDecoration: 'none', display: 'inline-block' }}
                      >
                        View →
                      </Link>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                        onClick={() => showToast(`Opening permission editor for ${agent.agent_name}...`)}
                      >
                        Scopes
                      </button>
                      {agent.status === 'active' && (
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                          onClick={() => showToast(`Suspending ${agent.agent_name}...`, 'error')}
                        >
                          Suspend
                        </button>
                      )}
                      {agent.status === 'suspended' && (
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                          onClick={() => showToast(`Reinstating ${agent.agent_name}...`)}
                        >
                          Reinstate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AgentRegistrationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); load(); }}
      />

      {/* Footer meta */}
      {!loading && (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="status-dot" style={{ background: isDemo ? 'var(--warning)' : 'var(--success)' }} />
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {isDemo ? 'Demo data — connect Supabase to see live agents' : `${data.length} agents loaded from API`}
          </span>
        </div>
      )}
    </div>
  );
}

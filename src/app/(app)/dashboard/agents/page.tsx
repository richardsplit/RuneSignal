'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Agent {
  id: string;
  name: string;
  description?: string;
  framework: string;
  platform: string;
  model?: string;
  status: string;
  risk_classification: string;
  eu_ai_act_category: string;
  is_sanctioned: boolean;
  discovery_method: string;
  first_seen_at: string;
  last_active_at?: string;
}

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#f59e0b',
  low: '#22c55e', unclassified: '#6b7280',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', inactive: '#6b7280', shadow: '#f59e0b', decommissioned: '#ef4444',
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: '0.625rem',
      padding: '2px 7px',
      borderRadius: '4px',
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function AgentRow({ agent }: { agent: Agent }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <td style={tdStyle}>
        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{agent.name}</div>
        {agent.description && (
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {agent.description.slice(0, 60)}{agent.description.length > 60 ? '…' : ''}
          </div>
        )}
      </td>
      <td style={tdStyle}>
        <Badge label={agent.framework} color="#3b82f6" />
      </td>
      <td style={tdStyle}>
        <Badge label={agent.platform} color="#8b5cf6" />
      </td>
      <td style={tdStyle}>
        <Badge label={agent.risk_classification} color={RISK_COLORS[agent.risk_classification] || '#6b7280'} />
      </td>
      <td style={tdStyle}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {agent.eu_ai_act_category?.replace('_', ' ') || '—'}
        </span>
      </td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Badge
            label={agent.is_sanctioned ? 'Sanctioned' : 'Shadow'}
            color={agent.is_sanctioned ? '#22c55e' : '#f59e0b'}
          />
          <Badge label={agent.status} color={STATUS_COLORS[agent.status] || '#6b7280'} />
        </div>
      </td>
      <td style={tdStyle}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {agent.last_active_at
            ? new Date(agent.last_active_at).toLocaleDateString()
            : '—'}
        </span>
      </td>
    </tr>
  );
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '0.625rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  textAlign: 'left',
  borderBottom: '1px solid var(--border-default)',
  whiteSpace: 'nowrap',
};

export default function AgentInventoryPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [shadowCount, setShadowCount] = useState(0);
  const [filters, setFilters] = useState({ framework: '', platform: '', risk: '', status: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', framework: 'unknown', platform: 'custom', is_sanctioned: false });
  const [adding, setAdding] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filters.framework) params.set('framework', filters.framework);
      if (filters.platform) params.set('platform', filters.platform);
      if (filters.risk) params.set('risk_classification', filters.risk);
      if (filters.status) params.set('status', filters.status);

      const res = await fetch(`/api/v1/agents/inventory?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        setShadowCount(data.shadow_ai_count || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await fetch('/api/v1/agents/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });
      setShowAddModal(false);
      setNewAgent({ name: '', framework: 'unknown', platform: 'custom', is_sanctioned: false });
      await fetchAgents();
    } finally {
      setAdding(false);
    }
  };

  const shadowAgents = agents.filter(a => !a.is_sanctioned && a.status !== 'decommissioned');

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Agent Inventory
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Discover and govern all AI agents operating in your organization.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          + Add Agent
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Agents', value: agents.length, color: '#3b82f6' },
          { label: 'Shadow AI (Unsanctioned)', value: shadowCount, color: '#f59e0b' },
          { label: 'High Risk', value: agents.filter(a => a.risk_classification === 'high' || a.risk_classification === 'critical').length, color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} style={{
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            padding: '16px',
            background: 'var(--bg-surface-1)',
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Shadow AI Warning */}
      {shadowCount > 0 && (
        <div style={{
          border: '1px solid #f59e0b44',
          borderRadius: '8px',
          padding: '12px 16px',
          background: '#f59e0b0a',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '1.125rem' }}>⚠️</span>
          <div>
            <span style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.8125rem' }}>
              {shadowCount} unsanctioned agent{shadowCount !== 1 ? 's' : ''} detected
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
              — Shadow AI increases EU AI Act Article 26 compliance risk. Review and classify these agents.
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { key: 'framework', label: 'Framework', options: ['', 'langchain', 'autogen', 'crewai', 'custom', 'unknown'] },
          { key: 'platform', label: 'Platform', options: ['', 'openai', 'anthropic', 'azure', 'aws', 'custom'] },
          { key: 'risk', label: 'Risk', options: ['', 'critical', 'high', 'medium', 'low', 'unclassified'] },
          { key: 'status', label: 'Status', options: ['', 'active', 'inactive', 'shadow', 'decommissioned'] },
        ].map(({ key, label, options }) => (
          <select
            key={key}
            value={(filters as any)[key]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface-1)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <option value="">{label}: All</option>
            {options.filter(Boolean).map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: '44px', borderRadius: '8px', background: 'var(--bg-surface-1)' }} />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div style={{
          border: '1px dashed var(--border-default)',
          borderRadius: '10px',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🤖</div>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            All clear — no shadow AI detected
          </div>
          <div style={{ fontSize: '0.8125rem' }}>
            Add agents manually or use the SDK to auto-register them on first call.
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-default)', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-1)' }}>
                {['Name', 'Framework', 'Platform', 'Risk Level', 'EU AI Act Category', 'Status', 'Last Active'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Shadow agents first */}
              {shadowAgents.map(a => <AgentRow key={a.id} agent={a} />)}
              {agents.filter(a => a.is_sanctioned || a.status === 'decommissioned').map(a => <AgentRow key={a.id} agent={a} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-surface-1)', border: '1px solid var(--border-default)',
            borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '95vw',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>
              Add Agent
            </h2>
            <form onSubmit={handleAddAgent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                placeholder="Agent name"
                value={newAgent.name}
                onChange={e => setNewAgent(a => ({ ...a, name: e.target.value }))}
                required
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface-2)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}
              />
              <select
                value={newAgent.framework}
                onChange={e => setNewAgent(a => ({ ...a, framework: e.target.value }))}
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface-2)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}
              >
                {['langchain', 'autogen', 'crewai', 'custom', 'unknown'].map(o => <option key={o}>{o}</option>)}
              </select>
              <select
                value={newAgent.platform}
                onChange={e => setNewAgent(a => ({ ...a, platform: e.target.value }))}
                style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface-2)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}
              >
                {['openai', 'anthropic', 'azure', 'aws', 'custom'].map(o => <option key={o}>{o}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newAgent.is_sanctioned}
                  onChange={e => setNewAgent(a => ({ ...a, is_sanctioned: e.target.checked }))}
                />
                Sanctioned by IT/Security
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8125rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  style={{ padding: '7px 14px', borderRadius: '6px', background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                >
                  {adding ? 'Adding…' : 'Add Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

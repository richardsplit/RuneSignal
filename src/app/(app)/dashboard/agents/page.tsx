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
  critical: 'var(--danger)', high: 'var(--warning)', medium: 'var(--warning)',
  low: 'var(--success)', unclassified: 'var(--text-tertiary)',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--success)', inactive: 'var(--text-tertiary)', shadow: 'var(--warning)', decommissioned: 'var(--danger)',
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: '0.625rem',
      padding: '2px 7px',
      borderRadius: 'var(--radius-sm)',
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      color,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap' as const,
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
          <div className="t-caption" style={{ marginTop: '2px' }}>
            {agent.description.slice(0, 60)}{agent.description.length > 60 ? '…' : ''}
          </div>
        )}
      </td>
      <td style={tdStyle}>
        <Badge label={agent.framework} color="var(--info)" />
      </td>
      <td style={tdStyle}>
        <Badge label={agent.platform} color="var(--accent)" />
      </td>
      <td style={tdStyle}>
        <Badge label={agent.risk_classification} color={RISK_COLORS[agent.risk_classification] || 'var(--text-tertiary)'} />
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
            color={agent.is_sanctioned ? 'var(--success)' : 'var(--warning)'}
          />
          <Badge label={agent.status} color={STATUS_COLORS[agent.status] || 'var(--text-tertiary)'} />
        </div>
      </td>
      <td style={tdStyle}>
        <span className="t-caption">
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
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase' as const,
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
    <div style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Agent Inventory</h1>
          <p className="page-description">Discover and govern all AI agents operating in your organization.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Agent</button>
      </div>

      {/* Stats */}
      <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Total Agents',           value: agents.length,                                                                                            color: undefined },
          { label: 'Shadow AI (Unsanctioned)', value: shadowCount,                                                                                             color: 'var(--warning)' },
          { label: 'High Risk',              value: agents.filter(a => a.risk_classification === 'high' || a.risk_classification === 'critical').length, color: 'var(--danger)' },
        ].map(stat => (
          <div key={stat.label} className="kpi-card">
            <div className="kpi-value" style={stat.color ? { color: stat.color } : undefined}>{stat.value}</div>
            <div className="kpi-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Shadow AI Warning */}
      {shadowCount > 0 && (
        <div className="callout callout-warning" style={{ marginBottom: '1.25rem' }}>
          <strong>{shadowCount} unsanctioned agent{shadowCount !== 1 ? 's' : ''} detected</strong>
          {' — '}
          Shadow AI increases EU AI Act Article 26 compliance risk. Review and classify these agents.
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { key: 'framework', label: 'Framework', options: ['', 'langchain', 'autogen', 'crewai', 'custom', 'unknown'] },
          { key: 'platform', label: 'Platform', options: ['', 'openai', 'anthropic', 'azure', 'aws', 'custom'] },
          { key: 'risk', label: 'Risk', options: ['', 'critical', 'high', 'medium', 'low', 'unclassified'] },
          { key: 'status', label: 'Status', options: ['', 'active', 'inactive', 'shadow', 'decommissioned'] },
        ].map(({ key, label, options }) => (
          <select
            key={key}
            className="form-input"
            value={(filters as any)[key]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            style={{ fontSize: '0.75rem', padding: '0.3125rem 0.625rem', cursor: 'pointer' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: '44px', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">All clear — no shadow AI detected</p>
          <p className="empty-state-body">Add agents manually or use the SDK to auto-register them on first call.</p>
        </div>
      ) : (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {['Name', 'Framework', 'Platform', 'Risk Level', 'EU AI Act Category', 'Status', 'Last Active'].map(h => (
                  <th key={h}>{h}</th>
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
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <span className="modal-title">Add Agent</span>
              <button className="modal-close" onClick={() => setShowAddModal(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddAgent} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  className="form-input"
                  placeholder="Agent name"
                  value={newAgent.name}
                  onChange={e => setNewAgent(a => ({ ...a, name: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
                <select
                  className="form-input"
                  value={newAgent.framework}
                  onChange={e => setNewAgent(a => ({ ...a, framework: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  {['langchain', 'autogen', 'crewai', 'custom', 'unknown'].map(o => <option key={o}>{o}</option>)}
                </select>
                <select
                  className="form-input"
                  value={newAgent.platform}
                  onChange={e => setNewAgent(a => ({ ...a, platform: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  {['openai', 'anthropic', 'azure', 'aws', 'custom'].map(o => <option key={o}>{o}</option>)}
                </select>
                <label className="t-body-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newAgent.is_sanctioned}
                    onChange={e => setNewAgent(a => ({ ...a, is_sanctioned: e.target.checked }))}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Sanctioned by IT/Security
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={adding}>
                    {adding ? 'Adding…' : 'Add Agent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

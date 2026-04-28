'use client';

import React, { useState } from 'react';

interface MoralEventFeedProps {
  events: Array<{
    id: string;
    action_description: string;
    domain: string;
    verdict: string;
    conflict_reason?: string;
    agent_id: string;
    soul_version: number;
    oob_ticket_id?: string;
    created_at: string;
  }>;
  onFilterChange: (domain: string, verdict: string) => void;
}

export default function MoralEventFeed({ events, onFilterChange }: MoralEventFeedProps) {
  const [domainFilter, setDomainFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');

  const handleDomainChange = (val: string) => {
    setDomainFilter(val);
    onFilterChange(val === 'all' ? '' : val, verdictFilter === 'all' ? '' : verdictFilter);
  };

  const handleVerdictChange = (val: string) => {
    setVerdictFilter(val);
    onFilterChange(domainFilter === 'all' ? '' : domainFilter, val === 'all' ? '' : val);
  };

  const getVerdictBadge = (verdict: string) => {
    const cls =
      verdict === 'clear' ? 'chip chip-success' :
      verdict === 'pause' ? 'chip chip-warning' :
      verdict === 'block' ? 'chip chip-danger'  : 'chip';
    return <span className={cls}>{verdict.toUpperCase()}</span>;
  };

  return (
    <div className="surface" style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h3 className="t-h4">Moral Event Feed</h3>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select
            className="form-input"
            style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem', appearance: 'none' }}
            value={domainFilter}
            onChange={e => handleDomainChange(e.target.value)}
          >
            <option value="all">All Domains</option>
            <option value="finance">Finance</option>
            <option value="compliance">Compliance</option>
            <option value="security">Security</option>
            <option value="comms">Comms</option>
            <option value="ip">IP</option>
          </select>
          <select
            className="form-input"
            style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem', appearance: 'none' }}
            value={verdictFilter}
            onChange={e => handleVerdictChange(e.target.value)}
          >
            <option value="all">All Verdicts</option>
            <option value="clear">Clear</option>
            <option value="pause">Pause</option>
            <option value="block">Block</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-2)' }}>
              <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-4)' }}>Action</th>
              <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-4)' }}>Domain</th>
              <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-4)' }}>Verdict</th>
              <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-4)' }}>Reason</th>
              <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-4)' }}>Agent</th>
              <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-4)' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No moral events recorded yet.</td></tr>
            ) : events.map(evt => (
              <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="animate-fade-in">
                <td style={{ padding: 'var(--space-3) var(--space-4)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.action_description}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textTransform: 'capitalize' }}>{evt.domain}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{getVerdictBadge(evt.verdict)}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-tertiary)' }}>{evt.conflict_reason || '—'}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{evt.agent_id.substring(0, 8)}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{new Date(evt.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    const colors: Record<string, string> = {
      clear: 'var(--color-primary-emerald)',
      pause: 'var(--color-accent-amber)',
      block: 'var(--color-error-rose)',
    };
    return (
      <span style={{
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: `${colors[verdict] || '#666'}20`,
        color: colors[verdict] || '#666',
        border: `1px solid ${colors[verdict] || '#666'}40`
      }}>
        {verdict.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Moral Event Feed</h3>
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
            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Action</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Domain</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Verdict</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Reason</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Agent</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No moral events recorded yet.</td></tr>
            ) : events.map(evt => (
              <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-glass)' }} className="animate-fade-in">
                <td style={{ padding: '0.75rem 0.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.action_description}</td>
                <td style={{ padding: '0.75rem 0.5rem', textTransform: 'capitalize' }}>{evt.domain}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{getVerdictBadge(evt.verdict)}</td>
                <td style={{ padding: '0.75rem 0.5rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{evt.conflict_reason || '—'}</td>
                <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{evt.agent_id.substring(0, 8)}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{new Date(evt.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

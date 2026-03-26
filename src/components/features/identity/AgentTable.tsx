'use client';

import React from 'react';
import { useToast } from '@/components/ToastProvider';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  violations: number;
  lastSeen: string;
}

interface AgentTableProps {
  agents: Agent[];
}

export default function AgentTable({ agents }: AgentTableProps) {
  const { showToast } = useToast();

  return (
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Agent Fleet Dashboard</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}>Filter: All status</span>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Agent Name</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Type</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Status</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Violations</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Last Seen</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {agents.map(a => (
            <tr key={a.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <td style={{ padding: '1rem 1.5rem' }}>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{a.id}</div>
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>
                 <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{a.type}</span>
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>
                 <span style={{ 
                   fontSize: '0.75rem', 
                   padding: '0.2rem 0.6rem', 
                   borderRadius: '12px', 
                   background: a.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                   color: a.status === 'active' ? 'var(--color-primary-emerald)' : 'var(--color-accent-amber)',
                   border: `1px solid ${a.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                  }}>
                   {a.status.toUpperCase()}
                 </span>
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <span style={{ color: a.violations > 0 ? 'var(--color-error-rose)' : 'var(--color-text-muted)' }}>
                  {a.violations}
                </span>
              </td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{a.lastSeen}</td>
              <td style={{ padding: '1rem 1.5rem' }}>
                 <button 
                   className="btn btn-outline" 
                   style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                   onClick={() => showToast(`Opening permission scope editor for ${a.name}...`)}
                 >
                   Manage Scopes
                 </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
    <div className="surface" style={{ overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="t-h4">Agent Fleet</h3>
        <span className="chip">All statuses</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Agent Name</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Type</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Status</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Violations</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Last Seen</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {agents.map(a => (
            <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{a.id}</div>
              </td>
              <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                <span className="chip">{a.type}</span>
              </td>
              <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                <span className={a.status === 'active' ? 'chip chip-success' : 'chip chip-warning'}>
                  {a.status.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                <span style={{ color: a.violations > 0 ? 'var(--danger)' : 'var(--text-tertiary)', fontWeight: a.violations > 0 ? 600 : 400 }}>
                  {a.violations}
                </span>
              </td>
              <td style={{ padding: 'var(--space-4) var(--space-6)', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{a.lastSeen}</td>
              <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                <button
                  className="btn btn-outline btn-sm"
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

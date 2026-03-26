'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import AgentRegistrationModal from '@/components/features/identity/AgentRegistrationModal';

const DEFAULT_AGENTS = [
  { id: 'agt-001', name: 'InventoryManager', type: 'langgraph', status: 'active', violations: 0, lastSeen: '2 mins ago' },
  { id: 'agt-002', name: 'ContractAnalyst', type: 'crewai', status: 'active', violations: 0, lastSeen: '1 hour ago' },
  { id: 'agt-003', name: 'SlackBot_Dev', type: 'custom', status: 'suspended', violations: 12, lastSeen: '1 day ago' },
];

export default function IdentityDashboard() {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agents, setAgents] = useState<any[]>(DEFAULT_AGENTS);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('trustlayer_agents');
    if (saved) {
      setAgents(JSON.parse(saved));
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('trustlayer_agents', JSON.stringify(agents));
  }, [agents]);

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Agent Identity & Permissions</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Manage registered AI agents, scoped credentials, and security manifests.</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            Register New Agent
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Agents</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>42</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Active Now</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>18</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Suspended</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-amber)' }}>3</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Security Violations</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-error-rose)' }}>14</p>
          </div>
        </div>

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
      </div>

      <AgentRegistrationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={(newAgent: any) => setAgents(prev => [newAgent, ...prev])}
      />
    </>
  );
}

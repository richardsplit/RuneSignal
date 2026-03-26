'use client';

import React, { useState } from 'react';
import AgentRegistrationModal from '@/components/features/identity/AgentRegistrationModal';
import AgentTable from '@/components/features/identity/AgentTable';
import IdentityMetrics from '@/components/features/identity/IdentityMetrics';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const DEFAULT_AGENTS = [
  { id: 'agt-001', name: 'InventoryManager', type: 'langgraph', status: 'active', violations: 0, lastSeen: '2 mins ago' },
  { id: 'agt-002', name: 'ContractAnalyst', type: 'crewai', status: 'active', violations: 0, lastSeen: '1 hour ago' },
  { id: 'agt-003', name: 'SlackBot_Dev', type: 'custom', status: 'suspended', violations: 12, lastSeen: '1 day ago' },
];

export default function IdentityDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agents, setAgents] = useLocalStorage<any[]>('trustlayer_agents', DEFAULT_AGENTS);

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const suspendedAgents = agents.filter(a => a.status === 'suspended').length;
  const violations = agents.reduce((acc, a) => acc + a.violations, 0);

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

        <IdentityMetrics 
          totalAgents={agents.length}
          activeAgents={activeAgents}
          suspendedAgents={suspendedAgents}
          violations={violations}
        />

        <AgentTable agents={agents} />
      </div>

      <AgentRegistrationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={(newAgent: any) => setAgents([newAgent, ...agents])}
      />
    </>
  );
}

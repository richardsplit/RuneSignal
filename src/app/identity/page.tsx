'use client';

import React, { useState, useEffect } from 'react';
import AgentRegistrationModal from '@/components/features/identity/AgentRegistrationModal';
import AgentTable from '@/components/features/identity/AgentTable';
import IdentityMetrics from '@/components/features/identity/IdentityMetrics';
import { useToast } from '@/components/ToastProvider';

export default function IdentityDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchAgents = async () => {
    try {
      setLoading(true);
      // In a real app, the tenant_id would be in a cookie or auth context. 
      // Our middleware handles the header injection when deployed to Vercel/Next.
      // For local dev, we might need to pass a mock header if middleware isn't active.
      const res = await fetch('/api/v1/agents', {
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('tl_token') || ''
        }
      });
      const data = await res.json();
      if (data.agents) {
        // Transform DB data to UI format
        const transformed = data.agents.map((a: any) => ({
          id: a.id,
          name: a.agent_name,
          type: a.agent_type,
          status: a.status,
          violations: (a.permission_scopes || []).length > 0 ? 0 : 0, // Simplified: actual violation counts would come from audit logs
          lastSeen: a.last_seen_at ? new Date(a.last_seen_at).toLocaleTimeString() : 'Never'
        }));
        setAgents(transformed);
      }
    } catch (err) {
      showToast('Error fetching agents from database.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

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

        {loading ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--color-primary-emerald)' }}>Syncing with Agent Registry...</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--color-primary-emerald)', width: '40%', animation: 'loading 1.5s infinite linear' }}></div>
            </div>
          </div>
        ) : (
          <AgentTable agents={agents} />
        )}
      </div>

      <AgentRegistrationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          showToast('Agent registered successfully!');
          fetchAgents(); // Refresh list from DB
        }}
      />
    </>
  );
}

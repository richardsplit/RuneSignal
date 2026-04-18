'use client';

import React, { useState, useEffect } from 'react';
import CreateWorkspaceModal from '@/components/features/tenant/CreateWorkspaceModal';
import ManageTeamModal from '@/components/features/tenant/ManageTeamModal';
import BillingModal from '@/components/features/tenant/BillingModal';

export default function TenantManagementPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('runesignal_workspaces');
    if (saved) {
      setWorkspaces(JSON.parse(saved));
    } else {
      const initial = [
        { id: 'org-production-992a', name: 'Production Cluster', plan: 'Enterprise', agents: 42, status: 'ACTIVE', color: 'var(--accent)' },
        { id: 'org-staging-441f', name: 'Staging Environment', plan: 'Pro', agents: 12, status: 'ACTIVE', color: 'var(--info)' }
      ];
      setWorkspaces(initial);
      localStorage.setItem('runesignal_workspaces', JSON.stringify(initial));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (workspaces.length > 0) {
      localStorage.setItem('runesignal_workspaces', JSON.stringify(workspaces));
    }
  }, [workspaces]);

  const handleCreateSuccess = (newWorkspace: any) => {
    const workspaceWithColor = { ...newWorkspace, color: 'var(--accent)' };
    setWorkspaces([...workspaces, workspaceWithColor]);
  };

  const openManageTeam = (workspace: any) => {
    setSelectedWorkspace(workspace);
    setIsManageTeamOpen(true);
  };

  const openBilling = (workspace: any) => {
    setSelectedWorkspace(workspace);
    setIsBillingOpen(true);
  };

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Tenant Management</h1>
          <p className="page-description">Configure organizational settings, billing, and team access control across workspaces.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>Create New Workspace</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {workspaces.map((ws) => (
          <div key={ws.id} className="surface" style={{ padding: '1.5rem', borderTop: `3px solid ${ws.color || 'var(--accent)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{ws.name}</h3>
                <p className="t-mono text-tertiary" style={{ fontSize: '0.75rem' }}>{ws.id}</p>
              </div>
              <span className="badge badge-success">{ws.status}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div className="kpi-label">Agents</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{ws.agents}</div>
              </div>
              <div>
                <div className="kpi-label">Plan</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{ws.plan}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => openManageTeam(ws)}>Manage Team</button>
              <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => openBilling(ws)}>Billing</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <CreateWorkspaceModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={handleCreateSuccess} 
      />
      {selectedWorkspace && (
        <>
          <ManageTeamModal 
            isOpen={isManageTeamOpen} 
            onClose={() => setIsManageTeamOpen(false)} 
            workspaceName={selectedWorkspace.name}
          />
          <BillingModal 
            isOpen={isBillingOpen} 
            onClose={() => setIsBillingOpen(false)} 
            workspaceName={selectedWorkspace.name}
          />
        </>
      )}
    </div>
  );
}

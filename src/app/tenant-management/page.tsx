import React from 'react';

export default function TenantManagementPage() {
  return (
    <div style={{ padding: '0 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Tenant Management</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Configure organizational settings, billing, and team access control across workspaces.</p>
        </div>
        <button className="btn btn-primary">Create New Workspace</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Workspace 1 */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--color-primary-emerald)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Production Cluster</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>org-production-992a</p>
            </div>
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--color-primary-emerald)',
              fontWeight: 600
            }}>
              ACTIVE
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Agents</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>42</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Plan</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Enterprise</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}>Manage Team</button>
            <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}>Billing</button>
          </div>
        </div>

        {/* Workspace 2 */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--color-info-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Staging Environment</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>org-staging-441f</p>
            </div>
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--color-primary-emerald)',
              fontWeight: 600
            }}>
              ACTIVE
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Agents</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>12</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Plan</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Pro</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}>Manage Team</button>
            <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}>Billing</button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { createServerClient } from '@lib/db/supabase';
import { headers } from 'next/headers';

async function getDashboardMetrics(tenantId: string) {
  const supabase = await createServerClient();

  const [certResult, agentResult, conflictResult, incidentResult, controlResult] = await Promise.all([
    supabase
      .from('audit_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('module', 's3'),
    supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    supabase
      .from('audit_events')
      .select('id, event_type', { count: 'exact', head: false })
      .eq('tenant_id', tenantId)
      .eq('module', 's1')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('incidents')
      .select('id, severity, status', { count: 'exact', head: false })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("closed")'),
    supabase
      .from('controls')
      .select('id, status', { count: 'exact', head: false })
      .eq('tenant_id', tenantId),
  ]);

  const certificates = certResult.count ?? 0;
  const activeAgents = agentResult.count ?? 0;
  const conflicts = conflictResult.data ?? [];
  const totalConflicts = conflictResult.count ?? 0;
  const blockedConflicts = conflicts.filter(e => e.event_type === 'conflict.blocked').length;

  const openIncidents = incidentResult.data ?? [];
  const totalOpenIncidents = openIncidents.length;
  const criticalIncidents = openIncidents.filter(i => i.severity === 'critical').length;

  const allControls = controlResult.data ?? [];
  const failingControls = allControls.filter(c => c.status === 'failing').length;
  const passingControls = allControls.filter(c => c.status === 'passing').length;

  return { certificates, activeAgents, totalConflicts, blockedConflicts, totalOpenIncidents, criticalIncidents, failingControls, passingControls, totalControls: allControls.length };
}

export default async function Home() {
  const headersList = await headers();
  const tenantId = headersList.get('X-Tenant-Id') || '';

  const { certificates, activeAgents, totalConflicts, blockedConflicts, totalOpenIncidents, criticalIncidents, failingControls, passingControls, totalControls } =
    await getDashboardMetrics(tenantId);

  const controlPassRate = totalControls > 0 ? Math.round((passingControls / totalControls) * 100) : null;

  const incidentColor = totalOpenIncidents > 0
    ? (criticalIncidents > 0 ? 'var(--danger)' : 'var(--warning)')
    : 'var(--success)';

  const controlColor = failingControls > 0 ? 'var(--danger)' : 'var(--success)';

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Platform Overview</h1>
        <p className="page-description">Real-time visibility into your AI agent fleets.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>

        {/* Provenance */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div className="kpi-label">Provenance</div>
            <span className="badge badge-success">Active</span>
          </div>
          <div className="kpi-value success">{certificates.toLocaleString()}</div>
          <p className="t-body-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>Certificates generated</p>
        </div>

        {/* Agent Identity */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div className="kpi-label">Agent Identity</div>
            <span className="badge badge-success">Active</span>
          </div>
          <div className="kpi-value info">{activeAgents.toLocaleString()}</div>
          <p className="t-body-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>Registered agents active</p>
        </div>

        {/* Conflict */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div className="kpi-label">Conflict Arbiter</div>
            <span className="badge badge-success">Active</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline' }}>
            <div className="kpi-value warning">{totalConflicts}</div>
            {blockedConflicts > 0 && (
              <div className="kpi-value danger" style={{ fontSize: '1.25rem' }}>{blockedConflicts} blocked</div>
            )}
          </div>
          <p className="t-body-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>Conflicts detected (24h)</p>
        </div>

        {/* Incidents */}
        <a href="/incidents" style={{ textDecoration: 'none' }}>
          <div className="kpi-card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <div className="kpi-label">Incidents</div>
              {totalOpenIncidents === 0
                ? <span className="badge badge-success">Clear</span>
                : <span className="badge badge-danger">{criticalIncidents > 0 ? `${criticalIncidents} Critical` : 'Open'}</span>
              }
            </div>
            <div className="kpi-value" style={{ color: incidentColor }}>{totalOpenIncidents}</div>
            <p className="t-body-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>Open incidents</p>
          </div>
        </a>

        {/* Controls */}
        <a href="/controls" style={{ textDecoration: 'none' }}>
          <div className="kpi-card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <div className="kpi-label">Controls</div>
              {failingControls === 0
                ? <span className="badge badge-success">{controlPassRate !== null ? `${controlPassRate}% pass` : 'No controls'}</span>
                : <span className="badge badge-danger">{failingControls} failing</span>
              }
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline' }}>
              <div className="kpi-value" style={{ color: controlColor }}>{failingControls}</div>
              {totalControls > 0 && (
                <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>
                  / {totalControls}
                </div>
              )}
            </div>
            <p className="t-body-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>Failing compliance controls</p>
          </div>
        </a>

      </div>

      {/* Zero-state */}
      {activeAgents === 0 && certificates === 0 && (
        <div className="empty-state" style={{ marginTop: '2rem' }}>
          <p className="empty-state-title">Your governance environment is ready</p>
          <p className="empty-state-body">
            Register your first AI agent to start generating provenance certificates and firewall evaluations.
          </p>
          <a href="/identity" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Register first agent
          </a>
        </div>
      )}
    </div>
  );
}

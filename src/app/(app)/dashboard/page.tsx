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

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Platform Overview</h1>
        <p className="page-description">Real-time visibility into your AI agent fleets.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* S3 Card */}
        <div className="surface" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="t-h4">S3 Provenance</h3>
            <span className="badge badge-success">Active</span>
          </div>
          <p className="kpi-value success" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {certificates.toLocaleString()}
          </p>
          <p className="t-body-sm text-secondary">Certificates generated (all time)</p>
        </div>

        {/* S6 Card */}
        <div className="surface" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="t-h4">S6 Identity</h3>
            <span className="badge badge-success">Active</span>
          </div>
          <p className="kpi-value info" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {activeAgents.toLocaleString()}
          </p>
          <p className="t-body-sm text-secondary">Registered Agents Active</p>
        </div>

        {/* S1 Card */}
        <div className="surface" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="t-h4">S1 Conflict</h3>
            <span className="badge badge-success">Active</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
            <p className="kpi-value warning" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {totalConflicts}
            </p>
            {blockedConflicts > 0 && (
              <p className="kpi-value danger" style={{ fontSize: '1.25rem' }}>
                {blockedConflicts} Blocked
              </p>
            )}
          </div>
          <p className="t-body-sm text-secondary">Conflicts detected past 24h</p>
        </div>

        {/* Incidents Card */}
        <a href="/incidents" style={{ textDecoration: 'none' }}>
          <div className="surface" style={{ padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.15s', borderColor: totalOpenIncidents > 0 ? (criticalIncidents > 0 ? '#ef444430' : '#f59e0b30') : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className="t-h4">Incidents</h3>
              {totalOpenIncidents === 0
                ? <span className="badge badge-success">Clear</span>
                : <span className="badge badge-danger">{criticalIncidents > 0 ? `${criticalIncidents} Critical` : 'Open'}</span>
              }
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, color: totalOpenIncidents > 0 ? (criticalIncidents > 0 ? '#ef4444' : '#f59e0b') : 'var(--success)', marginBottom: '0.5rem', lineHeight: 1 }}>
              {totalOpenIncidents}
            </p>
            <p className="t-body-sm text-secondary">Open incidents (excl. closed)</p>
          </div>
        </a>

        {/* Controls Card */}
        <a href="/controls" style={{ textDecoration: 'none' }}>
          <div className="surface" style={{ padding: '1.5rem', cursor: 'pointer', borderColor: failingControls > 0 ? '#ef444430' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className="t-h4">Controls</h3>
              {failingControls === 0
                ? <span className="badge badge-success">{controlPassRate !== null ? `${controlPassRate}% Pass` : 'No controls'}</span>
                : <span className="badge badge-danger">{failingControls} Failing</span>
              }
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
              <p style={{ fontSize: '2.5rem', fontWeight: 700, color: failingControls > 0 ? '#ef4444' : 'var(--success)', marginBottom: '0.5rem', lineHeight: 1 }}>
                {failingControls}
              </p>
              {totalControls > 0 && (
                <p style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  / {totalControls}
                </p>
              )}
            </div>
            <p className="t-body-sm text-secondary">Failing compliance controls</p>
          </div>
        </a>
      </div>

      {/* Zero-state prompt for new tenants */}
      {activeAgents === 0 && certificates === 0 && (
        <div className="empty-state" style={{ marginTop: '2rem', borderStyle: 'dashed' }}>
          <p className="empty-state-title">Your governance environment is ready</p>
          <p className="empty-state-body">
            Register your first AI agent to start generating provenance certificates and firewall evaluations.
          </p>
          <a href="/identity" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Register First Agent
          </a>
        </div>
      )}
    </div>
  );
}

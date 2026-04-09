import React from 'react';
import { createServerClient } from '../../lib/db/supabase';
import { headers } from 'next/headers';

async function getDashboardMetrics(tenantId: string) {
  const supabase = await createServerClient();

  const [certResult, agentResult, conflictResult] = await Promise.all([
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
  ]);

  const certificates = certResult.count ?? 0;
  const activeAgents = agentResult.count ?? 0;
  const conflicts = conflictResult.data ?? [];
  const totalConflicts = conflictResult.count ?? 0;
  const blockedConflicts = conflicts.filter(e => e.event_type === 'conflict.blocked').length;

  return { certificates, activeAgents, totalConflicts, blockedConflicts };
}

export default async function Home() {
  const headersList = await headers();
  const tenantId = headersList.get('X-Tenant-Id') || '';

  const { certificates, activeAgents, totalConflicts, blockedConflicts } =
    await getDashboardMetrics(tenantId);

  return (
    <div>
      <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
        Platform Overview
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem' }}>
        Real-time visibility into your AI agent fleets.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* S3 Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>S3 Provenance</h3>
            <span style={{ background: 'var(--border-glass)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span>
          </div>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary-emerald)' }}>
            {certificates.toLocaleString()}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Certificates generated (all time)</p>
        </div>

        {/* S6 Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>S6 Identity</h3>
            <span style={{ background: 'var(--border-glass)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span>
          </div>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-info-cyan)' }}>
            {activeAgents.toLocaleString()}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Registered Agents Active</p>
        </div>

        {/* S1 Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>S1 Conflict</h3>
            <span style={{ background: 'var(--border-glass)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-accent-amber)' }}>
              {totalConflicts}
            </p>
            {blockedConflicts > 0 && (
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-error-rose)' }}>
                {blockedConflicts} Blocked
              </p>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Conflicts detected past 24h</p>
        </div>
      </div>

      {/* Zero-state prompt for new tenants */}
      {activeAgents === 0 && certificates === 0 && (
        <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Your governance environment is ready</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Register your first AI agent to start generating provenance certificates and firewall evaluations.
          </p>
          <a href="/identity" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.6rem 1.5rem', background: 'var(--color-primary-emerald)', color: '#fff', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Register First Agent
          </a>
        </div>
      )}
    </div>
  );
}

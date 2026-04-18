'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import SoulStatusCard from '@/components/features/moral/SoulStatusCard';
import MoralEventFeed from '@/components/features/moral/MoralEventFeed';
import DomainHeatMap from '@/components/features/moral/DomainHeatMap';
import SOULEditorModal from '@/components/features/moral/SOULEditorModal';
import { useTenant } from '@lib/contexts/TenantContext';

export default function MoralOSDashboard() {
  const { showToast } = useToast();
  const { tenantId, loading: tenantLoading } = useTenant();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [soulData, setSoulData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  const fetchData = async (domainFilter?: string, verdictFilter?: string) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Fetch SOUL
      const soulRes = await fetch('/api/v1/moral?type=soul', { headers: { 'X-Tenant-Id': tenantId } });
      if (soulRes.ok) {
        setSoulData(await soulRes.json());
      } else {
        setSoulData(null);
      }

      // Fetch events
      let eventsUrl = '/api/v1/moral?type=events&limit=50';
      if (domainFilter) eventsUrl += `&domain=${domainFilter}`;
      if (verdictFilter) eventsUrl += `&verdict=${verdictFilter}`;
      const eventsRes = await fetch(eventsUrl, { headers: { 'X-Tenant-Id': tenantId } });
      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }
    } catch (e) {
      console.error('Failed to fetch MoralOS data:', e);
      showToast('Failed to load MoralOS data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchData();
    } else if (!tenantLoading) {
      setLoading(false);
    }
  }, [tenantId, tenantLoading]);

  const handleFilterChange = (domain: string, verdict: string) => {
    fetchData(domain, verdict);
  };

  // Metrics
  const totalEvents = events.length;
  const pauseCount = events.filter(e => e.verdict === 'pause').length;
  const blockCount = events.filter(e => e.verdict === 'block').length;
  const clearRate = totalEvents > 0
    ? Math.round(((totalEvents - pauseCount - blockCount) / totalEvents) * 100)
    : 100;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: '0.625rem',
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
      }}>
        <span
          className="status-dot online"
          style={{ animation: 'skeletonPulse 1.4s ease-in-out infinite' }}
        />
        Loading policy data…
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '1.75rem',
      }}>
        <div>
          <h1 className="page-title">Policy Engine</h1>
          <p className="page-description">
            Corporate SOUL governance, moral conflict detection, and agent conscience evaluation.
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => setIsEditorOpen(true)}
        >
          Configure SOUL
        </button>
      </div>

      {/* KPI strip — joined border-radius pattern */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        marginBottom: '1.75rem',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--bg-surface-1)',
      }}>
        {/* SOUL Version */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRight: '1px solid var(--border-subtle)',
        }}>
          <div className="kpi-label">SOUL Version</div>
          <div className="kpi-value accent">
            {soulData ? `v${soulData.version}` : '—'}
          </div>
        </div>

        {/* Total Events */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRight: '1px solid var(--border-subtle)',
        }}>
          <div className="kpi-label">Total Events</div>
          <div className="kpi-value">{totalEvents}</div>
        </div>

        {/* Blocks */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRight: '1px solid var(--border-subtle)',
        }}>
          <div className="kpi-label">Blocks</div>
          <div className="kpi-value danger">{blockCount}</div>
        </div>

        {/* Clear Rate */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div className="kpi-label">Clear Rate</div>
          <div className="kpi-value success">{clearRate}%</div>
        </div>
      </div>

      {/* SOUL Status */}
      <SoulStatusCard
        version={soulData?.version || null}
        signedBy={soulData?.signed_by || '—'}
        createdAt={soulData?.created_at || ''}
        signatureValid={true}
        onConfigureClick={() => setIsEditorOpen(true)}
      />

      {/* Main grid: Event Feed (2fr) + Domain HeatMap (1fr) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.25rem',
        marginTop: '1.25rem',
      }}>
        {/* Event Feed panel */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Moral Event Feed</span>
          </div>
          <MoralEventFeed events={events} onFilterChange={handleFilterChange} />
        </div>

        {/* Domain HeatMap panel */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Domain Activity</span>
          </div>
          <DomainHeatMap events={events} />
        </div>
      </div>

      <SOULEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSuccess={() => fetchData()}
        currentSoul={soulData?.soul}
      />
    </>
  );
}

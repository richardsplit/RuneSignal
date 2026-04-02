'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import SoulStatusCard from '@/components/features/moral/SoulStatusCard';
import MoralEventFeed from '@/components/features/moral/MoralEventFeed';
import DomainHeatMap from '@/components/features/moral/DomainHeatMap';
import SOULEditorModal from '@/components/features/moral/SOULEditorModal';

export default function MoralOSDashboard() {
  const { showToast } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [soulData, setSoulData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  const tenantId = typeof window !== 'undefined'
    ? localStorage.getItem('tl_tenant_id') || '7da27c93-6889-4fda-8b22-df4689fbbcd6'
    : '7da27c93-6889-4fda-8b22-df4689fbbcd6';

  const fetchData = async (domainFilter?: string, verdictFilter?: string) => {
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
    fetchData();
  }, []);

  const handleFilterChange = (domain: string, verdict: string) => {
    fetchData(domain, verdict);
  };

  // Metrics
  const totalEvents = events.length;
  const pauseCount = events.filter(e => e.verdict === 'pause').length;
  const blockCount = events.filter(e => e.verdict === 'block').length;
  const clearRate = totalEvents > 0 ? Math.round(((totalEvents - pauseCount - blockCount) / totalEvents) * 100) : 100;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p>Loading MoralOS data...</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>MoralOS</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Corporate SOUL governance, moral conflict detection, and agent conscience engine.</p>
          </div>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>SOUL Version</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>{soulData ? `v${soulData.version}` : 'None'}</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Events</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalEvents}</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Blocks / Pauses</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--color-error-rose)' }}>{blockCount}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}> / </span>
              <span style={{ color: 'var(--color-accent-amber)' }}>{pauseCount}</span>
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Clear Rate</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>{clearRate}%</p>
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

        {/* Main Grid: Events + Heat Map */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <MoralEventFeed events={events} onFilterChange={handleFilterChange} />
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

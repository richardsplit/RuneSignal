'use client';

import React from 'react';

interface DomainStats {
  domain: string;
  label: string;
  icon: string;
  pauseCount: number;
  blockCount: number;
}

interface DomainHeatMapProps {
  events: Array<{ domain: string; verdict: string }>;
}

export default function DomainHeatMap({ events }: DomainHeatMapProps) {
  const domains: DomainStats[] = [
    { domain: 'finance', label: 'Finance', icon: '💰', pauseCount: 0, blockCount: 0 },
    { domain: 'compliance', label: 'Compliance', icon: '📋', pauseCount: 0, blockCount: 0 },
    { domain: 'ip', label: 'IP Protection', icon: '🔒', pauseCount: 0, blockCount: 0 },
    { domain: 'comms', label: 'Communications', icon: '📧', pauseCount: 0, blockCount: 0 },
    { domain: 'security', label: 'Security', icon: '🛡️', pauseCount: 0, blockCount: 0 },
  ];

  // Aggregate counts from events
  events.forEach(e => {
    const d = domains.find(x => x.domain === e.domain);
    if (d) {
      if (e.verdict === 'pause') d.pauseCount++;
      if (e.verdict === 'block') d.blockCount++;
    }
  });

  const getSeverityBorder = (pauses: number, blocks: number) => {
    const total = pauses + blocks * 3;
    if (total === 0) return 'var(--success-border)';
    if (total < 5)  return 'var(--info-border)';
    if (total < 15) return 'var(--warning-border)';
    return 'var(--danger-border)';
  };

  return (
    <div className="surface" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Domain Heat Map</h3>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginBottom: '1rem' }}>Last 30 days</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {domains.map(d => (
          <div key={d.domain} style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-2)',
            border: `1px solid ${getSeverityBorder(d.pauseCount, d.blockCount)}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>{d.icon}</span>
              <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{d.label}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--warning)' }}>{d.pauseCount} paused</span>
              <span style={{ color: 'var(--danger)' }}>{d.blockCount} blocked</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

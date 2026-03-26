'use client';

import React from 'react';

interface ResolvedException {
  id: string;
  agent: string;
  priority: string;
  title: string;
  status: 'approved' | 'rejected' | string;
  reason: string;
}

interface ResolvedHistoryProps {
  resolved: ResolvedException[];
}

export default function ResolvedHistory({ resolved }: ResolvedHistoryProps) {
  if (resolved.length === 0) return null;

  return (
    <>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>Recently Resolved</h3>
      {resolved.map(r => (
        <div key={r.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
             <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{r.title} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 400 }}>by {r.agent}</span></div>
             <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.reason}</div>
          </div>
          <span style={{ 
            fontSize: '0.75rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '4px',
            background: r.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: r.status === 'approved' ? 'var(--color-primary-emerald)' : 'var(--color-error-rose)'
          }}>
            {r.status.toUpperCase()}
          </span>
        </div>
      ))}
    </>
  );
}

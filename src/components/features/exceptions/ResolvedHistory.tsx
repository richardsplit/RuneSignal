'use client';

import React from 'react';

interface ResolvedException {
  id: string;
  agent_id: string;
  priority: string;
  title: string;
  status: 'approved' | 'rejected' | string;
  resolution_reason: string;
  resolved_at: string;
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
        <div key={r.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
             <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
               {r.title} 
               <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 400, marginLeft: '0.5rem' }}>
                 via Agent {r.agent_id.split('-')[0]}
               </span>
             </div>
             <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
               "{r.resolution_reason}"
             </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              fontSize: '0.65rem', 
              padding: '0.2rem 0.6rem', 
              borderRadius: '4px',
              display: 'block',
              marginBottom: '0.25rem',
              background: r.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: r.status === 'approved' ? 'var(--color-primary-emerald)' : 'var(--color-error-rose)',
              border: `1px solid ${r.status === 'approved' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
            }}>
              {r.status.toUpperCase()}
            </span>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
              {new Date(r.resolved_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

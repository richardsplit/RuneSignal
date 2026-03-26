'use client';

import React from 'react';

interface Exception {
  id: string;
  agent: string;
  priority: string;
  title: string;
  status: string;
  sla: string;
}

interface ExceptionsTableProps {
  exceptions: Exception[];
  onAction: (id: string, action: 'approved' | 'rejected') => void;
  getPriorityColor: (priority: string) => string;
}

export default function ExceptionsTable({ exceptions, onAction, getPriorityColor }: ExceptionsTableProps) {
  if (exceptions.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        No open exceptions. All queues are clear!
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '2rem' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Action Required (Open Tickets)</h3>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Ticket ID</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Agent</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Description</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Priority</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>SLA Deadline</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {exceptions.map(exc => (
            <tr key={exc.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{exc.id}</td>
              <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{exc.agent}</td>
              <td style={{ padding: '1rem 1.5rem' }}>{exc.title}</td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <span style={{ 
                  color: getPriorityColor(exc.priority), 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  textTransform: 'uppercase',
                  border: `1px solid ${getPriorityColor(exc.priority)}80`,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px'
                }}>
                  {exc.priority}
                </span>
              </td>
              <td style={{ padding: '1rem 1.5rem', color: exc.priority === 'critical' ? 'var(--color-error-rose)' : 'var(--color-text-main)', fontWeight: exc.priority === 'critical' ? 700 : 400 }}>{exc.sla}</td>
              <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                   <button 
                     className="btn btn-primary" 
                     style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'var(--color-primary-emerald)' }}
                     onClick={() => onAction(exc.id, 'approved')}
                   >
                     Approve
                   </button>
                   <button 
                     className="btn btn-outline" 
                     style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: 'var(--color-error-rose)', borderColor: 'var(--color-error-rose)' }}
                     onClick={() => onAction(exc.id, 'rejected')}
                   >
                     Reject
                   </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import React from 'react';

interface Exception {
  id: string;
  agent_id: string;
  priority: string;
  title: string;
  status: string;
  sla_deadline: string;
}

interface ExceptionsTableProps {
  exceptions: Exception[];
  onAction: (id: string, action: 'approve' | 'reject') => void;
  getPriorityColor: (priority: string) => string;
}

const getTimeRemaining = (deadline: string) => {
  const diff = new Date(deadline).getTime() - new Date().getTime();
  if (diff <= 0) return 'BREACHED';
  
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
};

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
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Agent ID</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Description</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Priority</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>SLA Deadline</th>
            <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {exceptions.map(exc => {
            const timeRemaining = getTimeRemaining(exc.sla_deadline);
            const isBreached = timeRemaining === 'BREACHED';

            return (
              <tr key={exc.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{exc.id.split('-')[0]}</td>
                <td style={{ padding: '1rem 1.5rem', fontWeight: 500, fontSize: '0.875rem' }}>{exc.agent_id.split('-')[0]}</td>
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
                <td style={{ 
                  padding: '1rem 1.5rem', 
                  color: isBreached ? 'var(--color-error-rose)' : (exc.priority === 'critical' ? 'var(--color-accent-amber)' : 'var(--color-text-main)'), 
                  fontWeight: isBreached ? 700 : 400 
                }}>
                  {timeRemaining}
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                     <button 
                       className="btn btn-primary" 
                       style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'var(--color-primary-emerald)' }}
                       onClick={() => onAction(exc.id, 'approve')}
                     >
                       Approve
                     </button>
                     <button 
                       className="btn btn-outline" 
                       style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: 'var(--color-error-rose)', borderColor: 'var(--color-error-rose)' }}
                       onClick={() => onAction(exc.id, 'reject')}
                     >
                       Reject
                     </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
      <div className="empty-state" style={{ marginBottom: '2rem' }}>
        <p className="empty-state-title">All queues are clear</p>
        <p className="empty-state-body">No open exceptions requiring action.</p>
      </div>
    );
  }

  return (
    <div className="surface" style={{ overflow: 'hidden', marginBottom: '2rem' }}>
      <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="t-h4">Action Required</h3>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Ticket ID</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Agent ID</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Description</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Priority</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>SLA</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {exceptions.map(exc => {
            const timeRemaining = getTimeRemaining(exc.sla_deadline);
            const isBreached = timeRemaining === 'BREACHED';

            const priorityClass =
              exc.priority === 'critical' ? 'chip chip-danger' :
              exc.priority === 'high'     ? 'chip chip-warning' :
                                           'chip';
            return (
              <tr key={exc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: 'var(--space-4) var(--space-6)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{exc.id.split('-')[0]}</td>
                <td style={{ padding: 'var(--space-4) var(--space-6)', fontWeight: 500, fontSize: '0.875rem' }}>{exc.agent_id.split('-')[0]}</td>
                <td style={{ padding: 'var(--space-4) var(--space-6)' }}>{exc.title}</td>
                <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                  <span className={priorityClass} style={{ textTransform: 'uppercase' }}>{exc.priority}</span>
                </td>
                <td style={{ 
                  padding: 'var(--space-4) var(--space-6)', 
                  color: isBreached ? 'var(--danger)' : exc.priority === 'critical' ? 'var(--warning)' : 'var(--text-primary)', 
                  fontWeight: isBreached ? 700 : 400 
                }}>
                  {timeRemaining}
                </td>
                <td style={{ padding: 'var(--space-4) var(--space-6)', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => onAction(exc.id, 'approve')}>Approve</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onAction(exc.id, 'reject')}>Reject</button>
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

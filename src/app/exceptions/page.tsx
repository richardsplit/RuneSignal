'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ToastProvider';

export default function ExceptionsDashboard() {
  const { showToast } = useToast();
  const [exceptions] = useState([
    { id: 'exc-5091', agent: 'FinanceBot', priority: 'critical', title: 'Unrecognized Wire Transfer Schema', status: 'open', sla: '12 mins', created: '3 mins ago' },
    { id: 'exc-5088', agent: 'SupportAgent', priority: 'high', title: 'Refund Exceeds Authorized Limit ($5,000)', status: 'open', sla: '45 mins', created: '15 mins ago' },
    { id: 'exc-5042', agent: 'SDR_Bot', priority: 'medium', title: 'Missing Lead Enrichment Data', status: 'open', sla: '3.5 hours', created: '30 mins ago' },
  ]);

  const [resolved] = useState([
    { id: 'exc-5040', agent: 'CodeCopilot', priority: 'high', title: 'Push to Protected Branch', status: 'rejected', reason: 'Violation of CI/CD policy', created: '1 day ago' },
  ]);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'var(--color-error-rose)';
      case 'high': return 'var(--color-accent-amber)';
      case 'medium': return 'var(--color-info-cyan)';
      default: return 'var(--color-text-muted)';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Human-in-the-Loop Routing</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Manage exception tickets, SLA deadlines, and manual agent approvals.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline"
            onClick={() => showToast('Syncing global SLA configuration...')}
          >
            SLA Settings
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => showToast('Opening Slack integration settings...')}
          >
            Integrations (Slack/Jira)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Open Exceptions</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>24</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>SLA Breaches (24h)</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>0</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Critical Pending</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-error-rose)' }}>1</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Avg Resolution Time</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-info-cyan)' }}>14m</p>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                       onClick={() => showToast(`Successfully APPROVED exception ${exc.id}. Logged to ledger.`)}
                     >
                       Approve
                     </button>
                     <button 
                       className="btn btn-outline" 
                       style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: 'var(--color-error-rose)', borderColor: 'var(--color-error-rose)' }}
                       onClick={() => showToast(`REJECTED exception ${exc.id}. Agent notification sent.`, 'error')}
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

      {/* Resolved History */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>Recently Resolved</h3>
      {resolved.map(r => (
        <div key={r.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
    </div>
  );
}

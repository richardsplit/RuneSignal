'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import IntegrationsModal from '@/components/features/exceptions/IntegrationsModal';
import ExceptionsTable from '@/components/features/exceptions/ExceptionsTable';
import ExceptionMetrics from '@/components/features/exceptions/ExceptionMetrics';
import ResolvedHistory from '@/components/features/exceptions/ResolvedHistory';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const DEFAULT_EXCEPTIONS = [
  { id: 'exc-5091', agent: 'FinanceBot', priority: 'critical', title: 'Unrecognized Wire Transfer Schema', status: 'open', sla: '12 mins' },
  { id: 'exc-5088', agent: 'SupportAgent', priority: 'high', title: 'Refund Exceeds Authorized Limit ($5,000)', status: 'open', sla: '45 mins' },
  { id: 'exc-5042', agent: 'SDR_Bot', priority: 'medium', title: 'Missing Lead Enrichment Data', status: 'open', sla: '3.5 hours' },
];

const DEFAULT_RESOLVED = [
  { id: 'exc-5040', agent: 'CodeCopilot', priority: 'high', title: 'Push to Protected Branch', status: 'rejected', reason: 'Violation of CI/CD policy' },
];

export default function ExceptionsDashboard() {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [exceptions, setExceptions] = useLocalStorage<any[]>('trustlayer_exceptions', DEFAULT_EXCEPTIONS);
  const [resolved, setResolved] = useLocalStorage<any[]>('trustlayer_resolved', DEFAULT_RESOLVED);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'var(--color-error-rose)';
      case 'high': return 'var(--color-accent-amber)';
      case 'medium': return 'var(--color-info-cyan)';
      default: return 'var(--color-text-muted)';
    }
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    const target = exceptions.find(e => e.id === id);
    if (!target) return;
    
    showToast(`Processing ${action.toUpperCase()} action for ${id}...`, 'info');
    await new Promise(r => setTimeout(r, 1000));
    
    setExceptions(exceptions.filter(e => e.id !== id));
    setResolved([{
      id: target.id,
      agent: target.agent,
      priority: target.priority,
      title: target.title,
      status: action,
      reason: `Manually ${action} by Admin (Database Sync Complete)`
    }, ...resolved]);
    
    showToast(`Successfully ${action.toUpperCase()} exception ${id}. Ledger updated.`, action === 'approved' ? 'success' : 'error');
  };

  return (
    <>
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
              onClick={() => setIsModalOpen(true)}
            >
              Integrations (Slack/Jira)
            </button>
          </div>
        </div>

        <ExceptionMetrics 
          openExceptions={exceptions.length + 21}
          slaBreaches={0}
          criticalPending={exceptions.filter(e => e.priority === 'critical').length}
          avgResolutionTime="14m"
        />

        <ExceptionsTable 
          exceptions={exceptions} 
          onAction={handleAction} 
          getPriorityColor={getPriorityColor} 
        />

        <ResolvedHistory resolved={resolved} />
      </div>
      
      <IntegrationsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

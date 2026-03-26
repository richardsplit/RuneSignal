'use client';

import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [resolved, setResolved] = useState<any[]>([]);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'var(--color-error-rose)';
      case 'high': return 'var(--color-accent-amber)';
      case 'medium': return 'var(--color-info-cyan)';
      default: return 'var(--color-text-muted)';
    }
  };

  const fetchTickets = async () => {
    try {
      const tenantId = localStorage.getItem('tl_tenant_id') || '32c2de2e-e89d-44a6-98e7-27ee88e06bc7'; // Default for MVP
      const res = await fetch('/api/v1/exceptions', {
        headers: { 'X-Tenant-Id': tenantId }
      });
      const data = await res.json();
      
      if (res.ok) {
        setExceptions(data.filter((t: any) => t.status === 'open' || t.status === 'escalated'));
        setResolved(data.filter((t: any) => t.status !== 'open' && t.status !== 'escalated'));
      }
    } catch (e) {
      console.error('Failed to fetch exceptions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    const tenantId = localStorage.getItem('tl_tenant_id') || '32c2de2e-e89d-44a6-98e7-27ee88e06bc7';
    
    showToast(`Processing ${action.toUpperCase()}...`, 'info');
    
    try {
      const res = await fetch(`/api/v1/exceptions/${id}/resolve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId 
        },
        body: JSON.stringify({
          action,
          reason: `Resolved via TrustLayer Dashboard`,
          reviewer_id: 'admin-001' // Mock reviewer ID for MVP
        })
      });

      if (res.ok) {
        showToast(`Successfully ${action.toUpperCase()}D ticket.`, 'success');
        fetchTickets(); // Refresh list
      } else {
        const err = await res.json();
        showToast(`Failure: ${err.error}`, 'error');
      }
    } catch (e) {
      showToast('Network error during resolution', 'error');
    }
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

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { exceptions as exceptionsApi, ExceptionTicket, ApiError } from '@/lib/api';
import { ApiErrorBanner, SkeletonTable } from '@/components/Skeleton';

/* ─── Demo fallback ──────────────────────────────────────────────────── */
const DEMO_OPEN: ExceptionTicket[] = [
  { id: 'exc-5091', tenant_id: 'demo', agent_id: 'agt-001', title: 'Unrecognized wire transfer schema',     description: 'Agent attempted to invoke payment API with an unregistered schema.', priority: 'critical', status: 'open', context_data: {}, created_at: new Date(Date.now() - 180000).toISOString(),  sla_deadline: new Date(Date.now() + 720000).toISOString(),  agent_credentials: { agent_name: 'FinanceBot'   } },
  { id: 'exc-5088', tenant_id: 'demo', agent_id: 'agt-002', title: 'Refund exceeds authorized limit ($5k)', description: 'Refund amount exceeds the per-transaction authorization ceiling.',    priority: 'high',     status: 'open', context_data: {}, created_at: new Date(Date.now() - 900000).toISOString(),  sla_deadline: new Date(Date.now() + 2700000).toISOString(), agent_credentials: { agent_name: 'SupportAgent' } },
  { id: 'exc-5042', tenant_id: 'demo', agent_id: 'agt-003', title: 'Missing lead enrichment data',          description: 'CRM enrichment step returned null for required fields.',            priority: 'medium',   status: 'open', context_data: {}, created_at: new Date(Date.now() - 1800000).toISOString(), sla_deadline: new Date(Date.now() + 12600000).toISOString(),agent_credentials: { agent_name: 'SDR_Bot'      } },
];
const DEMO_RESOLVED: ExceptionTicket[] = [
  { id: 'exc-5040', tenant_id: 'demo', agent_id: 'agt-004', title: 'Push to protected branch',          description: 'CI/CD policy violation.', priority: 'high',   status: 'rejected', context_data: {}, created_at: new Date(Date.now() - 86400000).toISOString(), resolved_by: 'M. Chen', agent_credentials: { agent_name: 'CodeCopilot'   } },
  { id: 'exc-5031', tenant_id: 'demo', agent_id: 'agt-002', title: 'Bulk close tickets without note',   description: 'Missing resolution notes on 47 tickets.', priority: 'medium', status: 'approved', context_data: {}, created_at: new Date(Date.now() - 172800000).toISOString(), resolved_by: 'R. Shah', agent_credentials: { agent_name: 'SupportAgent' } },
];

/* ─── Helpers ────────────────────────────────────────────────────────── */
function formatSla(iso?: string): string {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs < 0) return 'Overdue';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr`;
  return `${Math.floor(hrs / 24)} days`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

type Priority = ExceptionTicket['priority'];
const PRIORITY_MAP: Record<Priority, { cls: string }> = {
  critical: { cls: 'badge badge-danger'  },
  high:     { cls: 'badge badge-warning' },
  medium:   { cls: 'badge badge-info'    },
  low:      { cls: 'badge badge-neutral' },
};

const STATUS_MAP: Record<ExceptionTicket['status'], { cls: string; label: string }> = {
  open:      { cls: 'badge badge-warning', label: 'Open'      },
  approved:  { cls: 'badge badge-success', label: 'Approved'  },
  rejected:  { cls: 'badge badge-danger',  label: 'Rejected'  },
  escalated: { cls: 'badge badge-info',    label: 'Escalated' },
};

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function ExceptionsPage() {
  const { showToast } = useToast();

  const [openItems, setOpenItems]         = useState<ExceptionTicket[]>([]);
  const [resolvedItems, setResolvedItems] = useState<ExceptionTicket[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [resolvedVisible, setResolvedVisible] = useState(false);
  const [pendingActions, setPendingActions]   = useState<Set<string>>(new Set());
  const [isDemo, setIsDemo]               = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [openRes, resolvedRes] = await Promise.all([
        exceptionsApi.list('open'),
        exceptionsApi.list('approved'),
      ]);
      setOpenItems(openRes.exceptions);
      setResolvedItems(resolvedRes.exceptions);
      setIsDemo(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Network error';
      setError(msg);
      setOpenItems(DEMO_OPEN);
      setResolvedItems(DEMO_RESOLVED);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = useCallback(async (
    ticket: ExceptionTicket,
    action: 'approve' | 'reject',
  ) => {
    const label = action === 'approve' ? 'Approved' : 'Rejected';
    setPendingActions(s => new Set(s).add(ticket.id));
    try {
      if (!isDemo) {
        await exceptionsApi.resolve(ticket.id, action, `${label} via dashboard`);
      }
      setOpenItems(prev => prev.filter(e => e.id !== ticket.id));
      setResolvedItems(prev => [{ ...ticket, status: action === 'approve' ? 'approved' : 'rejected', resolved_by: 'Admin', resolved_at: new Date().toISOString() }, ...prev]);
      showToast(`${label} ${ticket.id}. Logged to audit ledger.`, action === 'approve' ? 'success' : 'info');
    } catch {
      showToast(`Failed to ${action} ${ticket.id}. Please retry.`, 'error');
    } finally {
      setPendingActions(s => { const n = new Set(s); n.delete(ticket.id); return n; });
    }
  }, [isDemo, showToast]);

  const criticalCount = openItems.filter(e => e.priority === 'critical').length;

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Review Queue</h1>
          <p className="page-description">Human-in-the-loop exception routing and SLA-governed approvals.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => showToast('Opening SLA configuration...')}>SLA Settings</button>
          <button className="btn btn-outline" onClick={() => showToast('Opening integration settings...')}>Integrations</button>
        </div>
      </div>

      {error && !isDemo && <ApiErrorBanner message={error} onRetry={load} />}

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Open Exceptions',    value: openItems.length, color: undefined },
          { label: 'Critical Pending',   value: criticalCount,    color: criticalCount > 0 ? 'var(--danger)' : undefined },
          { label: 'SLA Breaches (24h)', value: 0,                color: 'var(--success)' },
          { label: 'Avg Resolution',     value: '14m',            color: 'var(--info)' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            {loading
              ? <div className="skeleton-pulse" style={{ height: 28, width: '35%', borderRadius: 'var(--radius-xs)', marginTop: 2 }} />
              : <div className="kpi-value" style={k.color ? { color: k.color } : undefined}>{k.value}</div>
            }
          </div>
        ))}
      </div>

      {/* Critical callout */}
      {!loading && criticalCount > 0 && (
        <div className="callout callout-danger" style={{ marginBottom: '1.5rem' }}>
          <strong>{criticalCount} critical exception{criticalCount > 1 ? 's' : ''}</strong> require immediate review — SLA window closing.
        </div>
      )}

      {/* Open exceptions table */}
      <div className="surface" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <span className="panel-title">Action Required</span>
          {!loading && <span className="badge badge-danger">{openItems.length} open</span>}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Agent</th>
              <th>Description</th>
              <th>Priority</th>
              <th>SLA Remaining</th>
              <th>Opened</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable rows={4} cols={['10%', '15%', '30%', '10%', '10%', '10%', '10%']} />
            ) : openItems.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <p className="empty-state-title">All clear</p>
                    <p className="empty-state-body">No open exceptions. Fleet operating within policy bounds.</p>
                  </div>
                </td>
              </tr>
            ) : openItems.map(exc => {
              const isPending = pendingActions.has(exc.id);
              const sla = formatSla(exc.sla_deadline);
              const slaOverdue = sla === 'Overdue';
              return (
                <tr key={exc.id} style={{
                  background: exc.priority === 'critical' ? 'var(--danger-soft)' : undefined,
                  opacity: isPending ? 0.5 : 1,
                  transition: 'opacity var(--t-fast)',
                }}>
                  <td><span className="t-mono text-tertiary">{exc.id}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{exc.agent_credentials?.agent_name ?? exc.agent_id}</span></td>
                  <td style={{ maxWidth: '240px', fontSize: '0.8125rem' }}>{exc.title}</td>
                  <td><span className={PRIORITY_MAP[exc.priority].cls}>{exc.priority}</span></td>
                  <td>
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: exc.priority === 'critical' ? 700 : 400,
                      color: slaOverdue ? 'var(--danger)' : exc.priority === 'critical' ? 'var(--danger)' : 'var(--text-secondary)',
                    }}>
                      {sla}
                    </span>
                  </td>
                  <td className="text-tertiary t-body-sm">{relativeTime(exc.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                        disabled={isPending}
                        onClick={() => handleResolve(exc, 'approve')}
                      >
                        {isPending ? '…' : 'Approve'}
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                        disabled={isPending}
                        onClick={() => handleResolve(exc, 'reject')}
                      >
                        {isPending ? '…' : 'Reject'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Resolved history */}
      <button
        className="btn btn-ghost"
        style={{ fontSize: '0.8125rem', marginBottom: '0.75rem', gap: '0.375rem' }}
        onClick={() => setResolvedVisible(v => !v)}
      >
        <span style={{ display: 'inline-block', transition: 'transform var(--t-fast)', transform: resolvedVisible ? 'rotate(90deg)' : 'none' }}>›</span>
        Recently Resolved ({resolvedItems.length})
      </button>

      {resolvedVisible && (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Agent</th>
                <th>Description</th>
                <th>Priority</th>
                <th>Resolution</th>
                <th>Reviewer</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {resolvedItems.map(exc => (
                <tr key={exc.id}>
                  <td><span className="t-mono text-tertiary">{exc.id}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{exc.agent_credentials?.agent_name ?? exc.agent_id}</span></td>
                  <td style={{ fontSize: '0.8125rem' }}>{exc.title}</td>
                  <td><span className={PRIORITY_MAP[exc.priority].cls}>{exc.priority}</span></td>
                  <td><span className={STATUS_MAP[exc.status].cls}>{STATUS_MAP[exc.status].label}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{exc.resolved_by ?? '—'}</td>
                  <td className="text-tertiary t-body-sm">{relativeTime(exc.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer meta */}
      {!loading && (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="status-dot" style={{ background: isDemo ? 'var(--warning)' : 'var(--success)' }} />
          <span className="t-caption">
            {isDemo ? 'Demo data — connect Supabase to see live exceptions' : 'Live data from API'}
          </span>
        </div>
      )}
    </div>
  );
}

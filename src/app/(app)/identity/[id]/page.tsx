'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { agents as agentsApi, agentBehavior, AgentCredential, AgentTimelineEvent, AgentBehaviorSummary, ApiError } from '@/lib/api';
import { RISK_TIER_MAP, SOURCE_META, DATE_RANGES, relativeTime, formatDate, eventTitle, eventHref, StatBox } from '@/components/features/identity/agent-detail-helpers';

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [agent, setAgent]             = useState<AgentCredential | null>(null);
  const [agentMeta, setAgentMeta]     = useState<Record<string, unknown>>({});
  const [events, setEvents]           = useState<AgentTimelineEvent[]>([]);
  const [summary, setSummary]         = useState<AgentBehaviorSummary | null>(null);
  const [evidence, setEvidence]       = useState<Array<{ report_id: string; report_type: string; generated_at: string; regulation: string }>>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [dateRange, setDateRange]     = useState(30);
  const [classifying, setClassifying] = useState(false);
  const [suspending, setSuspending]   = useState(false);
  const [riskTier, setRiskTier]       = useState<string>('unclassified');

  const load = useCallback(async (days = dateRange) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const end   = new Date().toISOString();
      const start = new Date(Date.now() - days * 86400000).toISOString();

      const [behaviorRes, evidenceRes] = await Promise.all([
        agentBehavior.getTimeline(id, { start, end, limit: 100 }),
        agentBehavior.getEvidence(id).catch(() => ({ contributions: [] })),
      ]);

      setAgentMeta(behaviorRes.agent);
      setEvents(behaviorRes.events);
      setSummary(behaviorRes.summary);
      setEvidence(evidenceRes.contributions);
      setRiskTier(String(behaviorRes.agent.eu_ai_act_category ?? 'unclassified'));

      /* also get typed agent record for status badge */
      const agentsList = await agentsApi.list();
      const found = agentsList.agents.find(a => a.id === id);
      if (found) setAgent(found);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load agent';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, dateRange]);

  useEffect(() => { load(); }, [load]);

  const handleRangeChange = (days: number) => {
    setDateRange(days);
    load(days);
  };

  const handleClassify = async () => {
    setClassifying(true);
    try {
      const res = await agentBehavior.classify(id);
      setRiskTier(res.eu_ai_act_category);
      showToast(`Risk tier: ${res.eu_ai_act_category} (${res.confidence})`, 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Classification failed', 'error');
    } finally {
      setClassifying(false);
    }
  };

  const handleSuspend = async () => {
    if (!agent) return;
    if (!window.confirm(`Suspend agent "${agent.agent_name}"? This will block all future actions.`)) return;
    setSuspending(true);
    try {
      await agentBehavior.suspend(id, 'Manually suspended from dashboard');
      showToast('Agent suspended', 'error');
      const agentsList = await agentsApi.list();
      const found = agentsList.agents.find(a => a.id === id);
      if (found) setAgent(found);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Suspend failed', 'error');
    } finally {
      setSuspending(false);
    }
  };

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div style={{ maxWidth: 1100 }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="skeleton-pulse" style={{ height: 14, width: 80, borderRadius: 'var(--radius-xs)' }} />
          <div className="skeleton-pulse" style={{ height: 14, width: 16, borderRadius: 'var(--radius-xs)' }} />
          <div className="skeleton-pulse" style={{ height: 14, width: 180, borderRadius: 'var(--radius-xs)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
          <div className="skeleton-pulse" style={{ height: 520, borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton-pulse" style={{ height: 520, borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 1100 }}>
        <Link href="/identity" style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', textDecoration: 'none' }}>← Agent Identity</Link>
        <div style={{ marginTop: '2rem', padding: '2rem', background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '0.5rem' }}>Failed to load agent</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>{error}</div>
          <button className="btn btn-outline" onClick={() => load()}>Retry</button>
        </div>
      </div>
    );
  }

  const agentName  = String(agentMeta.agent_name ?? agent?.agent_name ?? id);
  const agentType  = String(agentMeta.agent_type ?? agent?.agent_type ?? '—');
  const agentStatus = String(agentMeta.status ?? agent?.status ?? 'unknown');
  const riskMeta   = RISK_TIER_MAP[riskTier] ?? RISK_TIER_MAP.unclassified;

  const statusColor = agentStatus === 'active' ? 'var(--success)' : agentStatus === 'suspended' ? 'var(--danger)' : 'var(--text-tertiary)';

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
        <Link href="/identity" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          Agent Identity
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{agentName}</span>
      </div>

      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ margin: 0 }}>{agentName}</h1>
          <span className={agentStatus === 'active' ? 'chip chip-success' : agentStatus === 'suspended' ? 'chip chip-danger' : 'chip'} style={{ textTransform: 'capitalize' }}>
            {agentStatus}
          </span>
          <span className={riskMeta.chipClass}>
            {riskMeta.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexShrink: 0 }}>
          <button className="btn btn-outline" style={{ fontSize: '0.8125rem' }} onClick={handleClassify} disabled={classifying}>
            {classifying ? 'Classifying…' : 'Classify'}
          </button>
          {agentStatus === 'active' && (
            <button className="btn btn-danger" style={{ fontSize: '0.8125rem' }} onClick={handleSuspend} disabled={suspending}>
              {suspending ? 'Suspending…' : 'Suspend'}
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left: Agent card + stats ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Agent info */}
          <div className="surface" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>Agent Details</div>
            {[
              { label: 'Framework',   value: agentType },
              { label: 'Owner',       value: String(agentMeta.created_by ?? agent?.created_by ?? '—') },
              { label: 'Registered',  value: formatDate(String(agentMeta.created_at ?? '')) },
              { label: 'Last Seen',   value: relativeTime(String(agentMeta.last_seen_at ?? agent?.last_seen_at ?? '')) },
              { label: 'Agent ID',    value: id, mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.4375rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', minWidth: 90, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: mono ? '0.6875rem' : '0.8125rem', color: 'var(--text-primary)', wordBreak: 'break-all' }} className={mono ? 'mono' : undefined}>{value}</span>
              </div>
            ))}
          </div>

          {/* Summary stats */}
          {summary && (
            <div className="surface" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                Activity ({DATE_RANGES.find(r => r.days === dateRange)?.label ?? `${dateRange}d`})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <StatBox label="Audit Events"  value={summary.total_actions}    />
                <StatBox label="FW Blocks"     value={summary.blocked_actions}  color={summary.blocked_actions > 0 ? 'var(--danger)'  : undefined} />
                <StatBox label="HITL"          value={summary.hitl_escalations} color={summary.hitl_escalations > 0 ? 'var(--info)'    : undefined} />
                <StatBox label="Anomalies"     value={summary.anomalies}        color={summary.anomalies > 0 ? 'var(--warning)' : undefined} />
                <StatBox label="Incidents"     value={summary.incidents}        color={summary.incidents > 0 ? 'var(--danger)'  : undefined} />
              </div>
            </div>
          )}

          {/* Evidence contributions */}
          <div className="surface" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.625rem' }}>
              Evidence Contributions ({evidence.length})
            </div>
            {evidence.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>No evidence bundles reference this agent yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {evidence.map(e => (
                  <div key={e.report_id} style={{ padding: '0.5rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{e.report_type}</div>
                    <div style={{ color: 'var(--text-tertiary)', marginTop: '0.125rem' }}>
                      {e.regulation} · {relativeTime(e.generated_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registered scopes */}
          {Array.isArray(agentMeta.permission_scopes) && (agentMeta.permission_scopes as unknown[]).length > 0 && (
            <div className="surface" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.625rem' }}>
                Permission Scopes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {(agentMeta.permission_scopes as Array<{ resource: string; actions: string[] }>).map((scope, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{scope.resource}</strong>: {scope.actions?.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Behavior timeline ── */}
        <div className="surface" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              Behavior Timeline
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {DATE_RANGES.map(r => (
                <button
                  key={r.days}
                  onClick={() => handleRangeChange(r.days)}
                  className={`chip${dateRange === r.days ? ' chip-accent' : ''}`}
                  style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontSize: '0.6875rem', padding: '0.2rem 0.5rem' }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {events.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              No events found for this agent in the selected time range.
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '1.375rem' }}>
              {/* vertical line */}
              <div style={{ position: 'absolute', left: '0.375rem', top: 8, bottom: 8, width: 1, background: 'var(--border-subtle)' }} />

              {events.map((event, i) => {
                const meta  = SOURCE_META[event.source];
                const title = eventTitle(event);
                const href  = eventHref(event);
                const detail = { ...event.event };
                delete detail.id; delete detail.tenant_id; delete detail.agent_id; delete detail.created_at; delete detail.updated_at;
                const hasDetail = Object.keys(detail).length > 0;

                return (
                  <div key={i} style={{ position: 'relative', marginBottom: '1rem' }}>
                    {/* dot */}
                    <div style={{
                      position: 'absolute', left: -17, top: 5,
                      width: 8, height: 8, borderRadius: '50%',
                      background: meta.color, border: '1.5px solid var(--surface-1)',
                    }} />

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ marginRight: '0.25rem' }}>{meta.icon}</span>
                        <span style={{ color: meta.color }}>{meta.label}</span>
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>{title}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        {new Date(event.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {hasDetail && (
                      <div style={{
                        marginTop: '0.25rem', marginLeft: '0.125rem',
                        padding: '0.375rem 0.625rem',
                        background: 'var(--surface-2)', borderRadius: 'var(--radius-xs)',
                        fontSize: '0.6875rem', color: 'var(--text-secondary)',
                        display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
                      }}>
                        {Object.entries(detail).slice(0, 5).map(([k, v]) => (
                          <span key={k}>
                            <span style={{ color: 'var(--text-tertiary)' }}>{k}:</span>{' '}
                            <span style={{ color: 'var(--text-primary)' }}>{String(v).slice(0, 60)}</span>
                          </span>
                        ))}
                        {href && (
                          <Link href={href} style={{ color: 'var(--accent)', textDecoration: 'none', marginLeft: 'auto' }}>View →</Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

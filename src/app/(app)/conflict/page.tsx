'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import PolicyBuilderModal from '@/components/features/conflict/PolicyBuilderModal';
import IntentFeed from '@/components/features/conflict/IntentFeed';
import PolicyList from '@/components/features/conflict/PolicyList';
import ConflictMetrics from '@/components/features/conflict/ConflictMetrics';

type IntentStatus = 'allow' | 'queue' | 'block';
type PolicyAction = 'block' | 'alert' | 'queue';

interface IntentItem {
  id: string;
  agent: string;
  intent: string;
  similarity: string;
  status: IntentStatus;
  reason: string;
  ts: string;
}

interface Policy {
  id: string;
  name: string;
  description: string;
  category: string;
  action: PolicyAction;
  triggers: number;
}

const INTENTS: IntentItem[] = [
  { id: 'int-992', agent: 'SDR_Bot',      intent: 'Update billing address for Acme Corp', similarity: '0.94', status: 'queue', reason: 'Collision with FinanceBot intent',  ts: '2 min ago' },
  { id: 'int-991', agent: 'SupportAgent', intent: 'Close ticket #4021',                  similarity: '0.12', status: 'allow', reason: 'No overlap detected',                ts: '5 min ago' },
  { id: 'int-990', agent: 'FinanceBot',   intent: 'Initiate wire transfer $4,200',        similarity: '0.88', status: 'block', reason: 'Matched FinancialGuard policy',      ts: '9 min ago' },
  { id: 'int-989', agent: 'LegalBot',     intent: 'Export contract to external drive',    similarity: '0.41', status: 'queue', reason: 'Data residency policy flagged',      ts: '14 min ago' },
];

const POLICIES: Policy[] = [
  { id: 'pol-001', name: 'FinancialGuard', description: 'Blocks unauthorized wire transfer or payment intents', category: 'Finance',  action: 'block', triggers: 24 },
  { id: 'pol-002', name: 'PII_Protector',  description: 'Alerts when PII extraction is detected in intent',    category: 'Privacy',  action: 'alert', triggers: 11 },
  { id: 'pol-003', name: 'DataResidency',  description: 'Queues exports to non-approved destinations',         category: 'Compliance', action: 'queue', triggers: 7 },
];

const INTENT_STATUS: Record<IntentStatus, { label: string; cls: string }> = {
  allow: { label: 'Allow',  cls: 'badge badge-success' },
  queue: { label: 'Queued', cls: 'badge badge-warning' },
  block: { label: 'Blocked', cls: 'badge badge-danger'  },
};

const ACTION_MAP: Record<PolicyAction, { cls: string }> = {
  block: { cls: 'badge badge-danger'  },
  alert: { cls: 'badge badge-warning' },
  queue: { cls: 'badge badge-info'    },
};

function SimilarityBar({ value }: { value: string }) {
  const pct = parseFloat(value) * 100;
  const color = pct >= 80 ? 'var(--danger)' : pct >= 40 ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: '3px', background: 'var(--border-default)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{value}</span>
    </div>
  );
}

export default function ConflictPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'feed' | 'policies'>('feed');

  const blocked = INTENTS.filter(i => i.status === 'block').length;
  const queued  = INTENTS.filter(i => i.status === 'queue').length;

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Conflict Arbiter</h1>
          <p className="page-description">Semantic intent collision detection and real-time mediation.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => showToast('Syncing policy configuration to vector DB...')}>
            Policy Config
          </button>
          <button className="btn btn-primary" onClick={() => showToast('Opening Semantic Policy Creator...')}>
            New Policy
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Total Mediated',  value: '1,842',                color: undefined },
          { label: 'Blocked (24h)',   value: String(blocked + 24),   color: 'var(--danger)'  },
          { label: 'Queued',          value: String(queued + 7),     color: 'var(--warning)' },
          { label: 'Active Policies', value: String(POLICIES.length), color: undefined },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={k.color ? { color: k.color } : undefined}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {(['feed', 'policies'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab${tab === t ? ' active' : ''}`}
          >
            {t === 'feed' ? 'Intent Feed' : 'Policies'}
          </button>
        ))}
      </div>

      {/* Intent feed */}
      {tab === 'feed' && (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Agent</th>
                <th>Intent</th>
                <th style={{ width: '140px' }}>Similarity</th>
                <th>Decision</th>
                <th>Reason</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {INTENTS.map(item => {
                const { label, cls } = INTENT_STATUS[item.status];
                return (
                  <tr key={item.id} style={{
                    background: item.status === 'block' ? 'var(--danger-soft)' : undefined,
                  }}>
                    <td><span className="t-mono" style={{ color: 'var(--text-tertiary)' }}>{item.id}</span></td>
                    <td><span style={{ fontWeight: 600 }}>{item.agent}</span></td>
                    <td style={{ maxWidth: '220px' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>"{item.intent}"</span>
                    </td>
                    <td><SimilarityBar value={item.similarity} /></td>
                    <td><span className={cls}>{label}</span></td>
                    <td className="text-tertiary t-body-sm">{item.reason}</td>
                    <td className="text-tertiary t-body-sm" style={{ whiteSpace: 'nowrap' }}>{item.ts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Policies */}
      {tab === 'policies' && (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Category</th>
                <th>Description</th>
                <th>Action</th>
                <th style={{ textAlign: 'right' }}>Triggers (30d)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {POLICIES.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                    <div className="t-mono" style={{ color: 'var(--text-tertiary)', marginTop: '1px' }}>{p.id}</div>
                  </td>
                  <td><span className="badge badge-neutral" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, fontSize: '0.75rem' }}>{p.category}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{p.description}</td>
                  <td><span className={ACTION_MAP[p.action].cls}>{p.action}</span></td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{p.triggers}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                      onClick={() => showToast(`Opening editor for ${p.name}...`)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

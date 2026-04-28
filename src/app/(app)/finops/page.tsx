'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ToastProvider';

interface Breakdown {
  total: number;
  by_agent: Record<string, number>;
  by_model: Record<string, number>;
}

// Static mock data shown when API returns null / fails
const MOCK_DATA: Breakdown = {
  total: 14.872,
  by_agent: {
    'FinanceBot': 6.42,
    'SupportAgent': 4.18,
    'ComplianceWatcher': 2.91,
    'SummaryBot': 1.362,
  },
  by_model: {
    'gpt-4o': 7.84,
    'claude-3-opus': 3.92,
    'gpt-4o-mini': 2.11,
    'gemini-1.5-pro': 1.002,
  },
};

function getTopKey(record: Record<string, number>): string {
  return Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
}

function CostBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{
      flex: 1,
      height: 6,
      background: 'var(--surface-3)',
      borderRadius: 3,
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: 'var(--accent)',
        borderRadius: 3,
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

interface BudgetForm { agent: string; limit: string; }

export default function FinOpsDashboard() {
  const { showToast } = useToast();
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState<BudgetForm>({ agent: 'FinanceBot', limit: '500' });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/v1/finops/breakdown?days=30')
      .then(r => r.json())
      .then(data => setBreakdown(data))
      .catch(console.error);
  }, []);

  // Use API data if available and valid, else fall back to mock
  const data: Breakdown = (breakdown && breakdown.total != null) ? breakdown : MOCK_DATA;
  const isMock = !(breakdown && breakdown.total != null);

  const modelEntries = Object.entries(data.by_model).sort((a, b) => b[1] - a[1]);
  const agentEntries = Object.entries(data.by_agent).sort((a, b) => b[1] - a[1]);
  const maxModel = modelEntries[0]?.[1] ?? 1;
  const maxAgent = agentEntries[0]?.[1] ?? 1;

  const topAgent = getTopKey(data.by_agent);
  const topModel = getTopKey(data.by_model);

  return (
    <>
      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h1 className="page-title">FinOps Control</h1>
            <p className="page-description">
              Agent cost tracking, budget enforcement, and model spend attribution.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
            {isMock && <span className="badge badge-neutral">Demo data</span>}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const csv = ['Model,Cost', ...modelEntries.map(([m, c]) => `${m},${c.toFixed(4)}`), '', 'Agent,Cost', ...agentEntries.map(([a, c]) => `${a},${c.toFixed(4)}`)].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'finops-report.csv'; a.click();
                URL.revokeObjectURL(url);
                showToast('Report exported', 'success');
              }}
            >
              Export CSV
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => showToast('Budget alert created for FinanceBot at 80%', 'success')}
            >
              Create Alert
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setBudgetOpen(true)}>
              Set Budget
            </button>
          </div>
        </div>
      </div>

      {/* Set Budget modal */}
      {budgetOpen && (
        <div
          ref={overlayRef}
          onClick={e => { if (e.target === overlayRef.current) setBudgetOpen(false); }}
          style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
        >
          <div className="surface" style={{ width: 400, padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Set Monthly Budget</h2>
            <div className="form-group">
              <label className="form-label">Agent</label>
              <select className="form-input" value={budgetForm.agent} onChange={e => setBudgetForm(f => ({ ...f, agent: e.target.value }))}>
                {agentEntries.map(([a]) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Limit (USD)</label>
              <input type="number" min="1" className="form-input" value={budgetForm.limit} onChange={e => setBudgetForm(f => ({ ...f, limit: e.target.value }))} placeholder="500" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setBudgetOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setBudgetOpen(false); showToast(`Budget set: ${budgetForm.agent} → $${budgetForm.limit}/mo`, 'success'); }}>Save Budget</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Spend (30d)</div>
          <div className="kpi-value mono" style={{ fontSize: '1.625rem' }}>${data.total.toFixed(4)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top Agent</div>
          <div className="kpi-value" style={{ color: 'var(--accent)', fontSize: '1.25rem' }}>{topAgent}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top Model</div>
          <div className="kpi-value" style={{ color: 'var(--info)', fontSize: '1.25rem' }}>{topModel}</div>
        </div>
      </div>

      {/* Budget alert */}
      <div className="callout callout-warning" style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontWeight: 600 }}>Budget Alert</span>
        <span>FinanceBot is approaching 80% of its $500/mo budget</span>
        <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>80% used</span>
      </div>

      {/* Cost breakdown panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Cost by Model */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Cost by Model</span>
            <span className="t-caption">Trailing 30 days</span>
          </div>

          {modelEntries.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th style={{ width: '40%' }}>Usage</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {modelEntries.map(([model, cost]) => (
                  <tr key={model}>
                    <td><span className="t-mono">{model}</span></td>
                    <td><CostBar value={cost} max={maxModel} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="t-mono" style={{ color: 'var(--accent)' }}>${cost.toFixed(4)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">No model spend data</p>
              <p className="empty-state-body">Cost attribution will appear once agents process requests.</p>
            </div>
          )}
        </div>

        {/* Cost by Agent */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Cost by Agent</span>
            <span className="t-caption">Trailing 30 days</span>
          </div>

          {agentEntries.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th style={{ width: '40%' }}>Usage</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {agentEntries.map(([agentId, cost]) => (
                  <tr key={agentId}>
                    <td>
                      <span className="t-mono" style={{ display: 'block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agentId}
                      </span>
                    </td>
                    <td><CostBar value={cost} max={maxAgent} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="t-mono" style={{ color: 'var(--accent)' }}>${cost.toFixed(4)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">No agent spend data</p>
              <p className="empty-state-body">Agent cost attribution will appear once requests are tracked.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

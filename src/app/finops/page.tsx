'use client';

import { useEffect, useState } from 'react';

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
      background: 'var(--bg-surface-3)',
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

export default function FinOpsDashboard() {
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">FinOps Control</h1>
            <p className="page-description">
              Agent cost tracking, budget enforcement, and model spend attribution.
            </p>
          </div>
          {isMock && (
            <span className="badge badge-neutral">Demo data</span>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        marginBottom: '1.75rem',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--bg-surface-1)',
      }}>
        {/* Total Spend */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRight: '1px solid var(--border-subtle)',
        }}>
          <div className="kpi-label">Total Spend (30d)</div>
          <div className="kpi-value mono" style={{ fontSize: '1.625rem' }}>
            ${data.total.toFixed(4)}
          </div>
        </div>

        {/* Top Agent */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRight: '1px solid var(--border-subtle)',
        }}>
          <div className="kpi-label">Top Agent</div>
          <div className="kpi-value accent" style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}>
            {topAgent}
          </div>
        </div>

        {/* Top Model */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div className="kpi-label">Top Model</div>
          <div className="kpi-value" style={{ fontSize: '1.25rem', letterSpacing: '-0.01em', color: 'var(--info)' }}>
            {topModel}
          </div>
        </div>
      </div>

      {/* Budget alert */}
      <div
        className="callout callout-warning"
        style={{
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          background: 'var(--warning-bg)',
          border: '1px solid var(--warning-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.8125rem',
        }}
      >
        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Budget Alert</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          FinanceBot is approaching 80% of its $500/mo budget
        </span>
        <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>80% used</span>
      </div>

      {/* Cost breakdown panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Cost by Model */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Cost by Model</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trailing 30 days</span>
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
                    <td>
                      <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                        {model}
                      </span>
                    </td>
                    <td>
                      <CostBar value={cost} max={maxModel} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.8125rem' }}>
                        ${cost.toFixed(4)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
            }}>
              <div className="empty-state-title" style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}>
                No model spend data
              </div>
              <div className="empty-state-body" style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
              }}>
                Cost attribution will appear once agents process requests.
              </div>
            </div>
          )}
        </div>

        {/* Cost by Agent */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Cost by Agent</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trailing 30 days</span>
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
                      <span className="mono" style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-primary)',
                        display: 'block',
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {agentId}
                      </span>
                    </td>
                    <td>
                      <CostBar value={cost} max={maxAgent} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.8125rem' }}>
                        ${cost.toFixed(4)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
            }}>
              <div className="empty-state-title" style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}>
                No agent spend data
              </div>
              <div className="empty-state-body" style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
              }}>
                Agent cost attribution will appear once requests are tracked.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

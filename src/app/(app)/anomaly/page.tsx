'use client';
import { useState, useEffect } from 'react';

interface AnomalyEvent {
  id: string;
  agent_id: string;
  anomaly_type: string;
  z_score: number;
  baseline_value: number;
  observed_value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { badgeClass: string; dotColor: string }> = {
  low:      { badgeClass: 'badge badge-neutral',  dotColor: 'var(--text-tertiary)' },
  medium:   { badgeClass: 'badge badge-warning',  dotColor: 'var(--warning)' },
  high:     { badgeClass: 'badge badge-warning',  dotColor: 'var(--warning)' },
  critical: { badgeClass: 'badge badge-danger',   dotColor: 'var(--danger)' },
};

const TYPE_LABELS: Record<string, string> = {
  cost_spike:   'Cost Spike',
  token_volume: 'Token Volume',
  error_rate:   'Error Rate',
  velocity:     'Call Velocity',
};

export default function AnomalyDashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnomalies = async () => {
    try {
      const res = await fetch('/api/v1/anomaly');
      const data = await res.json();
      setAnomalies(data.anomalies || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string) => {
    await fetch('/api/v1/anomaly', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anomaly_id: id }),
    });
    fetchAnomalies();
  };

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const highCount     = anomalies.filter(a => a.severity === 'high').length;
  const resolvedToday = anomalies.filter(a => a.resolved).length;

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p className="t-body-sm text-tertiary">Scanning telemetry…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000 }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Anomaly Detection</h1>
          <p className="page-description">Statistical behavioural deviations detected via Welford z-score streaming.</p>
        </div>
        <span className="chip chip-success" style={{ marginTop: '0.25rem', flexShrink: 0 }}>
          <span className="status-dot online" />
          Live · 8s
        </span>
      </div>

      {/* KPI strip */}
      <div className="kpi-strip">
        {[
          { label: 'Active Anomalies', value: anomalies.length, color: undefined },
          { label: 'Critical',         value: criticalCount,    color: 'var(--danger)'  },
          { label: 'High',             value: highCount,         color: 'var(--warning)' },
          { label: 'Resolved Today',   value: resolvedToday,     color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="kpi-card">
            <p className="kpi-label">{s.label}</p>
            <p className="kpi-value" style={s.color ? { color: s.color } : undefined}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Critical callout */}
      {criticalCount > 0 && (
        <div className="callout callout-danger" style={{ marginBottom: '1.5rem' }}>
          <strong>{criticalCount} critical anomal{criticalCount === 1 ? 'y' : 'ies'}</strong> require immediate investigation.
        </div>
      )}

      {/* Main table */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title">Live Anomaly Feed</span>
        </div>

        {anomalies.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No active anomalies</p>
            <p className="empty-state-body">All agent metrics are within baseline tolerances.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Agent</th>
                  <th>z-score</th>
                  <th>Baseline → Observed</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map(anomaly => {
                  const cfg = SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.low;
                  return (
                    <tr key={anomaly.id}>
                      <td>
                        <span className={cfg.badgeClass} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                          {anomaly.severity}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {TYPE_LABELS[anomaly.anomaly_type] || anomaly.anomaly_type}
                      </td>
                      <td>
                        <span className="t-mono" style={{ color: 'var(--text-tertiary)', display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {anomaly.agent_id}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {anomaly.z_score.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {anomaly.baseline_value.toFixed(4)}
                          <span style={{ color: 'var(--text-tertiary)', margin: '0 0.3rem' }}>→</span>
                          {anomaly.observed_value.toFixed(4)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {new Date(anomaly.created_at).toLocaleString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleResolve(anomaly.id)}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

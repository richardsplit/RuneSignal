'use client';

import React from 'react';

interface ExceptionMetricsProps {
  openExceptions: number;
  slaBreaches: number;
  criticalPending: number;
  avgResolutionTime: string;
}

export default function ExceptionMetrics({ openExceptions, slaBreaches, criticalPending, avgResolutionTime }: ExceptionMetricsProps) {
  return (
    <div className="kpi-strip" style={{ marginBottom: '2rem' }}>
      <div className="kpi-card">
        <div className="kpi-label">Open Exceptions</div>
        <div className="kpi-value">{openExceptions}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">SLA Breaches (24h)</div>
        <div className="kpi-value danger">{slaBreaches}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Critical Pending</div>
        <div className="kpi-value danger">{criticalPending}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Avg Resolution Time</div>
        <div className="kpi-value info">{avgResolutionTime}</div>
      </div>
    </div>
  );
}

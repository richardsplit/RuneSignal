'use client';

import React from 'react';

interface IdentityMetricsProps {
  totalAgents: number;
  activeAgents: number;
  suspendedAgents: number;
  violations: number;
}

export default function IdentityMetrics({ totalAgents, activeAgents, suspendedAgents, violations }: IdentityMetricsProps) {
  return (
    <div className="kpi-strip" style={{ marginBottom: '2rem' }}>
      <div className="kpi-card">
        <div className="kpi-label">Total Agents</div>
        <div className="kpi-value">{totalAgents}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Active Now</div>
        <div className="kpi-value success">{activeAgents}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Suspended</div>
        <div className="kpi-value warning">{suspendedAgents}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Security Violations</div>
        <div className="kpi-value danger">{violations}</div>
      </div>
    </div>
  );
}

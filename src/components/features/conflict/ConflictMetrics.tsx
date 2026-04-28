'use client';

import React from 'react';

interface ConflictMetricsProps {
  totalMediated: string;
  blockedConflicts: number;
  queuedConflicts: number;
}

export default function ConflictMetrics({ totalMediated, blockedConflicts, queuedConflicts }: ConflictMetricsProps) {
  return (
    <div className="kpi-strip" style={{ marginBottom: '2rem' }}>
      <div className="kpi-card">
        <div className="kpi-label">Total Mediated</div>
        <div className="kpi-value success">{totalMediated}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Blocked Conflicts</div>
        <div className="kpi-value danger">{blockedConflicts}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Queued (Collision)</div>
        <div className="kpi-value warning">{queuedConflicts}</div>
      </div>
    </div>
  );
}

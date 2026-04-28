'use client';

import React from 'react';

interface ProvenanceMetricsProps {
  totalCerts: number;
  detectionRate: string;
  anomalies: number;
}

export default function ProvenanceMetrics({ totalCerts, detectionRate, anomalies }: ProvenanceMetricsProps) {
  return (
    <div className="kpi-strip" style={{ marginBottom: '2rem' }}>
      <div className="kpi-card">
        <div className="kpi-label">Total Certificates</div>
        <div className="kpi-value">{totalCerts}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Detection Rate</div>
        <div className="kpi-value success">{detectionRate}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Model Version Anomalies</div>
        <div className="kpi-value warning">{anomalies}</div>
      </div>
    </div>
  );
}

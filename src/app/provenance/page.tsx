'use client';

import React, { useState } from 'react';

export default function ProvenanceDashboard() {
  // Mock data for initial MVP view
  const [certs] = useState([
    { id: '1a3f-8c2d', agent: 'LegalReviewBot', tags: ['contract-review', 'eu-ai-act'], hash: 'f4e2...89a1', time: '10 mins ago', status: 'verified' },
    { id: '7b2e-9d1a', agent: 'CodeCopilot', tags: ['code-gen'], hash: 'a1b2...3c4d', time: '1 hour ago', status: 'verified' },
    { id: '4d5c-2e8f', agent: 'SupportAgent', tags: ['customer-ticket'], hash: 'e5f6...7a8b', time: '3 hours ago', status: 'verified' },
  ]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>AI Output Provenance</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Cryptographically verify LLM outputs against the immutable ledger.</p>
        </div>
        <button className="btn btn-primary">Generate Certificate</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Certificates</h3>
          <p style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>14,204</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Detection Rate</h3>
          <p style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>100%</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Model Version Anomalies</h3>
          <p style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-accent-amber)' }}>2</p>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Certificates</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Certificate ID</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Agent</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Tags</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Output Hash</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Verified</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {certs.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: 'var(--color-info-cyan)' }}>{c.id}</td>
                <td style={{ padding: '1rem 1.5rem' }}>{c.agent}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {c.tags.map(t => (
                      <span key={t} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>{t}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{c.hash}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ color: 'var(--color-primary-emerald)' }}>✓ Valid</span>
                </td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{c.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

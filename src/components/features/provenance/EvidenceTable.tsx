'use client';

import React from 'react';

interface Certificate {
  id: string;
  agent: string;
  tags: string[];
  hash: string;
  time: string;
  status: string;
}

interface EvidenceTableProps {
  certs: Certificate[];
}

export default function EvidenceTable({ certs }: EvidenceTableProps) {
  return (
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
  );
}

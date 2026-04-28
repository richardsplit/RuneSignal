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
    <div className="surface" style={{ overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="t-h4">Recent Certificates</h3>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Certificate ID</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Agent</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Tags</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Output Hash</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Verified</th>
            <th className="t-table-head" style={{ padding: 'var(--space-3) var(--space-6)' }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {certs.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: 'var(--space-4) var(--space-6)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--accent)' }}>{c.id}</td>
              <td style={{ padding: 'var(--space-4) var(--space-6)' }}>{c.agent}</td>
              <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {c.tags.map(t => (
                    <span key={t} className="chip">{t}</span>
                  ))}
                </div>
              </td>
              <td style={{ padding: 'var(--space-4) var(--space-6)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{c.hash}</td>
              <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                <span className="chip chip-success">✓ Valid</span>
              </td>
              <td style={{ padding: 'var(--space-4) var(--space-6)', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{c.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

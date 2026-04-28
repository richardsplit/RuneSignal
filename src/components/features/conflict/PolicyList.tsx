'use client';

import React from 'react';

interface Policy {
  id: string;
  name: string;
  description: string;
  category: string;
  action: string;
}

interface PolicyListProps {
  policies: Policy[];
}

export default function PolicyList({ policies }: PolicyListProps) {
  return (
    <div className="surface" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-default)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Active Policies</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {policies.map(policy => (
          <div key={policy.id} style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{policy.name}</span>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--danger)' }}>{policy.action}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{policy.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

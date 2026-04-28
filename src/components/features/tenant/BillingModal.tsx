'use client';

import React from 'react';
import Modal from '../../ui/Modal';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
}

export default function BillingModal({ isOpen, onClose, workspaceName }: BillingModalProps) {
  const invoices = [
    { date: 'March 01, 2024', amount: '$499.00', status: 'Paid' },
    { date: 'February 01, 2024', amount: '$499.00', status: 'Paid' },
    { date: 'January 01, 2024', amount: '$499.00', status: 'Paid' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Billing - ${workspaceName}`}>
      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Current Plan Card */}
        <div className="surface" style={{ padding: 'var(--space-5)', borderLeft: '3px solid var(--accent)' }}>
          <div className="t-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Current Plan</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-5)' }}>
            <div>
              <div style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Pro Plan</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.125rem' }}>Billed monthly at $499.00</div>
            </div>
            <button className="btn btn-primary btn-sm">Upgrade Plan</button>
          </div>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>
              <span>Agent Throughput</span>
              <span style={{ fontWeight: 600 }}>42 / Unlimited</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--surface-3)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div style={{ width: '42%', height: '100%', background: 'var(--accent)', borderRadius: 'var(--radius-pill)' }} />
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Invoice History</h3>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {invoices.map((inv, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{inv.date}</span>
                <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{inv.amount}</span>
                  <span className="chip chip-success">{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}>Download All</button>
          <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}>Update Payment</button>
        </div>
      </div>
    </Modal>
  );
}

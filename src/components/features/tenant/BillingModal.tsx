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
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-emerald)', marginBottom: '0.5rem' }}>CURRENT PLAN</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Pro Plan</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Billed monthly at $499.00</div>
            </div>
            <button className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Upgrade Plan</button>
          </div>
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <span>Agent Throughput</span>
              <span style={{ fontWeight: 600 }}>42 / Unlimited</span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '6px', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{ width: '42%', height: '100%', background: 'var(--color-primary-emerald)' }}></div>
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Invoice History</h3>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {invoices.map((inv, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.85rem' }}>{inv.date}</span>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{inv.amount}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-emerald)' }}>{inv.status}</span>
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

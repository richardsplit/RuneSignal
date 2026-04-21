'use client';

import React, { useState } from 'react';
import { Control, ApiError } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { REGULATION_LABELS } from './ControlCard';

interface Props {
  control: Control | null;
  onClose: () => void;
  onCreated: () => void;
}

export function OpenIncidentModal({ control, onClose, onCreated }: Props) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [reportedBy, setReportedBy] = useState('');

  const overlayRef = React.useRef<HTMLDivElement>(null);
  const handleOverlayClick = (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose(); };

  if (!control) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)',
    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedBy.trim()) { showToast('Reported by is required', 'error'); return; }
    setSubmitting(true);
    try {
      const { incidents: incidentsApi } = await import('@/lib/api');
      await incidentsApi.create({
        title: `Control breach: ${control.name}`,
        description: control.description ?? undefined,
        severity: control.severity === 'critical' ? 'critical' : control.severity === 'high' ? 'high' : 'medium',
        category: 'compliance_gap',
        reported_by: reportedBy.trim(),
      });
      showToast('Incident created from control breach', 'success');
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to create incident', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={overlayRef} onClick={handleOverlayClick} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Open Incident from Control</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--bg-surface-2)', borderRadius: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Control breach: </strong>{control.name}<br />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {control.regulation && `${REGULATION_LABELS[control.regulation] ?? control.regulation}`}
              {control.clause_ref && ` · ${control.clause_ref}`}
              {` · ${control.consecutive_failures} consecutive failure${control.consecutive_failures !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reported By <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input style={inputStyle} value={reportedBy} onChange={e => setReportedBy(e.target.value)} placeholder="email or identifier" required autoFocus />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

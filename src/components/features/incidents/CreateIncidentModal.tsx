'use client';

import React, { useEffect, useRef, useState } from 'react';
import { incidents as incidentsApi, Incident, IncidentSeverity, IncidentCategory, ApiError } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  operational:      'Operational',
  safety:           'Safety',
  rights_violation: 'Rights Violation',
  security:         'Security',
  compliance_gap:   'Compliance Gap',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (incident: Incident) => void;
  prefill?: Partial<{ title: string; category: IncidentCategory; related_anomaly_ids: string[]; related_agent_ids: string[] }>;
}

export function CreateIncidentModal({ isOpen, onClose, onSuccess, prefill }: Props) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: prefill?.title ?? '',
    description: '',
    severity: 'medium' as IncidentSeverity,
    category: (prefill?.category ?? 'operational') as IncidentCategory,
    is_serious_incident: false,
    market_surveillance_authority: '',
    reported_by: '',
  });

  useEffect(() => {
    if (isOpen) setForm(f => ({ ...f, title: prefill?.title ?? f.title, category: prefill?.category ?? f.category }));
  }, [isOpen, prefill?.title, prefill?.category]);

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const overlayRef = useRef<HTMLDivElement>(null);
  const handleOverlayClick = (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose(); };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
    background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)',
    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: '0.375rem', letterSpacing: '0.04em', textTransform: 'uppercase',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    if (!form.reported_by.trim()) { showToast('Reported by is required', 'error'); return; }
    if (form.is_serious_incident && !form.market_surveillance_authority.trim()) {
      showToast('Market surveillance authority is required for serious incidents', 'error'); return;
    }
    setSubmitting(true);
    try {
      const incident = await incidentsApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        severity: form.severity,
        category: form.category,
        is_serious_incident: form.is_serious_incident,
        market_surveillance_authority: form.is_serious_incident ? form.market_surveillance_authority.trim() : undefined,
        reported_by: form.reported_by.trim(),
        related_anomaly_ids: prefill?.related_anomaly_ids,
        related_agent_ids: prefill?.related_agent_ids,
      });
      showToast('Incident created', 'success');
      onSuccess(incident);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to create incident', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={overlayRef} onClick={handleOverlayClick} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Create Incident</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.125rem' }}>EU AI Act Art. 73 · ISO 42001 §10.2</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Brief description of the incident" required />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical', fontFamily: 'inherit' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional context, affected systems, initial observations…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Severity <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select style={inputStyle} value={form.severity} onChange={e => set('severity', e.target.value as IncidentSeverity)}>
                {(['low', 'medium', 'high', 'critical'] as IncidentSeverity[]).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value as IncidentCategory)}>
                {(Object.entries(CATEGORY_LABELS) as [IncidentCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Reported By <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input style={inputStyle} value={form.reported_by} onChange={e => set('reported_by', e.target.value)} placeholder="email or system identifier" required />
          </div>
          <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: form.is_serious_incident ? 'var(--danger-soft)' : 'var(--surface-2)', border: `1px solid ${form.is_serious_incident ? 'var(--danger-border)' : 'var(--border-default)'}` }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_serious_incident} onChange={e => set('is_serious_incident', e.target.checked)} style={{ width: 14, height: 14, accentColor: 'var(--danger)' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Serious incident (EU AI Act Art. 73)</span>
            </label>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '0.375rem', marginLeft: '1.375rem' }}>
              Triggers a 15-day reporting deadline and requires notification to market surveillance authority.
            </p>
            {form.is_serious_incident && (
              <div style={{ marginTop: '0.75rem', marginLeft: '1.375rem' }}>
                <label style={labelStyle}>Market Surveillance Authority <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input style={inputStyle} value={form.market_surveillance_authority} onChange={e => set('market_surveillance_authority', e.target.value)} placeholder="e.g. BSI (Germany), ICO (UK)" required />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


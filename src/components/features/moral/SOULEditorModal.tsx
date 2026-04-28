'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ToastProvider';
import { useTenant } from '@lib/contexts/TenantContext';

interface SOULEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentSoul?: any;
}

const DEFAULT_SOUL = {
  financial: { transaction_limit_usd: 100000, anomaly_multiplier_threshold: 5, require_cfo_above_usd: 50000, blocked_vendor_categories: [] as string[] },
  compliance: { frameworks: ['GDPR', 'SOC2'], data_residency_regions: ['EU', 'US'], retention_rules: { pii: 365, logs: 730 } as Record<string, number>, require_dpo_for_deletion: true },
  sensitive_data: { classification_levels: ['public', 'internal', 'confidential', 'secret'], blocked_external_domains: [] as string[], ip_protection_paths: [] as string[], pii_handling: 'strict' as const },
  security: { no_self_privilege_escalation: true, require_approval_for_prod_deploy: true, blocked_network_egress: [] as string[], max_credential_scope: 'department' },
  authority: { role_permissions: {} as Record<string, string[]>, delegation_depth: 2, require_manager_oob_for: ['finance', 'security'] as string[], require_ciso_for: ['prod_deploy', 'privilege_escalation'] as string[] },
};

export default function SOULEditorModal({ isOpen, onClose, onSuccess, currentSoul }: SOULEditorModalProps) {
  const { showToast } = useToast();
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState('financial');
  const [soul, setSoul] = useState(currentSoul || DEFAULT_SOUL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const tabs = [
    { id: 'financial', label: 'Financial' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'sensitive_data', label: 'Sensitive Data' },
    { id: 'security', label: 'Security' },
    { id: 'authority', label: 'Authority' },
  ];

  const updateField = (section: string, field: string, value: unknown) => {
    setSoul((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      showToast('No active tenant context found.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/moral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({ soul, admin_id: 'dashboard-admin' })
      });
      if (res.ok) {
        showToast('Corporate SOUL updated successfully.', 'success');
        onSuccess();
        onClose();
        setShowConfirm(false);
      } else {
        const err = await res.json();
        showToast(`Failed: ${err.error}`, 'error');
      }
    } catch {
      showToast('Network error saving SOUL', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'financial':
        return (<>
          <div className="form-group">
            <label className="form-label">Transaction Limit (USD)</label>
            <input type="number" className="form-input" value={soul.financial.transaction_limit_usd} onChange={e => updateField('financial', 'transaction_limit_usd', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Require CFO Above (USD)</label>
            <input type="number" className="form-input" value={soul.financial.require_cfo_above_usd} onChange={e => updateField('financial', 'require_cfo_above_usd', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Anomaly Multiplier Threshold</label>
            <input type="number" className="form-input" value={soul.financial.anomaly_multiplier_threshold} onChange={e => updateField('financial', 'anomaly_multiplier_threshold', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Blocked Vendor Categories (comma-separated)</label>
            <input className="form-input" value={soul.financial.blocked_vendor_categories.join(', ')} onChange={e => updateField('financial', 'blocked_vendor_categories', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
          </div>
        </>);
      case 'compliance':
        return (<>
          <div className="form-group">
            <label className="form-label">Frameworks (comma-separated)</label>
            <input className="form-input" value={soul.compliance.frameworks.join(', ')} onChange={e => updateField('compliance', 'frameworks', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
          </div>
          <div className="form-group">
            <label className="form-label">Data Residency Regions (comma-separated)</label>
            <input className="form-input" value={soul.compliance.data_residency_regions.join(', ')} onChange={e => updateField('compliance', 'data_residency_regions', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" checked={soul.compliance.require_dpo_for_deletion} onChange={e => updateField('compliance', 'require_dpo_for_deletion', e.target.checked)} />
            <label className="form-label" style={{ marginBottom: 0 }}>Require DPO for Data Deletion</label>
          </div>
        </>);
      case 'sensitive_data':
        return (<>
          <div className="form-group">
            <label className="form-label">PII Handling</label>
            <select className="form-input" style={{ appearance: 'none' }} value={soul.sensitive_data.pii_handling} onChange={e => updateField('sensitive_data', 'pii_handling', e.target.value)}>
              <option value="strict">Strict</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Blocked External Domains (comma-separated)</label>
            <input className="form-input" value={soul.sensitive_data.blocked_external_domains.join(', ')} onChange={e => updateField('sensitive_data', 'blocked_external_domains', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
          </div>
          <div className="form-group">
            <label className="form-label">IP Protection Paths (comma-separated)</label>
            <input className="form-input" value={soul.sensitive_data.ip_protection_paths.join(', ')} onChange={e => updateField('sensitive_data', 'ip_protection_paths', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
          </div>
        </>);
      case 'security':
        return (<>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" checked={soul.security.no_self_privilege_escalation} onChange={e => updateField('security', 'no_self_privilege_escalation', e.target.checked)} />
            <label className="form-label" style={{ marginBottom: 0 }}>Block Self-Privilege Escalation</label>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" checked={soul.security.require_approval_for_prod_deploy} onChange={e => updateField('security', 'require_approval_for_prod_deploy', e.target.checked)} />
            <label className="form-label" style={{ marginBottom: 0 }}>Require Approval for Prod Deploy</label>
          </div>
          <div className="form-group">
            <label className="form-label">Blocked Network Egress (comma-separated)</label>
            <input className="form-input" value={soul.security.blocked_network_egress.join(', ')} onChange={e => updateField('security', 'blocked_network_egress', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Credential Scope</label>
            <input className="form-input" value={soul.security.max_credential_scope} onChange={e => updateField('security', 'max_credential_scope', e.target.value)} />
          </div>
        </>);
      case 'authority':
        return (<>
          <div className="form-group">
            <label className="form-label">Delegation Depth</label>
            <input type="number" className="form-input" value={soul.authority.delegation_depth} onChange={e => updateField('authority', 'delegation_depth', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Require Manager OOB For (comma-separated)</label>
            <input className="form-input" value={soul.authority.require_manager_oob_for.join(', ')} onChange={e => updateField('authority', 'require_manager_oob_for', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
          </div>
          <div className="form-group">
            <label className="form-label">Require CISO For (comma-separated)</label>
            <input className="form-input" value={soul.authority.require_ciso_for.join(', ')} onChange={e => updateField('authority', 'require_ciso_for', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
          </div>
        </>);
      default:
        return null;
    }
  };

  if (showConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowConfirm(false)} title="Confirm SOUL Update">
        <div style={{ maxWidth: '700px' }}>
          <div style={{ padding: 'var(--space-4)', background: 'var(--warning-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning-border)', marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ Warning</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>This will update the Corporate SOUL for ALL agents in this tenant. The change is cryptographically signed and immutable.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setShowConfirm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Signing...' : 'Sign & Deploy SOUL'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Corporate SOUL Editor">
      <div style={{ maxWidth: '700px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-default)', paddingBottom: '0.5rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'btn btn-primary' : 'btn btn-outline'}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTab()}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border-default)', paddingTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => setShowConfirm(true)}>Review & Sign</button>
        </div>
      </div>
    </Modal>
  );
}

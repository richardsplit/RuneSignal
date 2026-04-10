# S8 MoralOS — UI BUILD PROMPT (Part 2)

> **Companion to: `S8_MORALOS_BUILD_PROMPT.md`**
> Complete Part 1 (all backend files) BEFORE starting Part 2.

## CRITICAL UI RULES REMINDER

1. Every component file starts with `'use client';`
2. Use `import Modal from '@/components/ui/Modal';` for modals
3. Use `import { useToast } from '@/components/ToastProvider';` for toasts
4. Get tenant ID: `localStorage.getItem('tl_tenant_id') || '7da27c93-6889-4fda-8b22-df4689fbbcd6'`
5. CSS classes from `globals.css`: `glass-panel`, `gradient-text`, `btn`, `btn-primary`, `btn-outline`, `form-group`, `form-label`, `form-input`, `animate-fade-in`
6. CSS vars: `var(--color-primary-emerald)`, `var(--color-accent-amber)`, `var(--color-error-rose)`, `var(--color-info-cyan)`, `var(--color-text-main)`, `var(--color-text-muted)`, `var(--color-bg-surface)`, `var(--border-glass)`, `var(--radius-lg)`, `var(--radius-md)`
7. All styling done with inline `style={{}}` objects, NOT Tailwind
8. Modal max-width should be `700px` for the SOUL editor. Override by wrapping Modal content in a div or passing a style.

---

## STEP 8A: SoulStatusCard Component

**Create file: `src/components/features/moral/SoulStatusCard.tsx`**

```tsx
'use client';

import React from 'react';

interface SoulStatusCardProps {
  version: number | null;
  signedBy: string;
  createdAt: string;
  signatureValid: boolean;
  onConfigureClick: () => void;
}

export default function SoulStatusCard({ version, signedBy, createdAt, signatureValid, onConfigureClick }: SoulStatusCardProps) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Corporate SOUL Status</h2>
          {version ? (
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Version</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>v{version}</p>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Signed By</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>{signedBy}</p>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Last Updated</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>{new Date(createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Signature</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: signatureValid ? 'var(--color-primary-emerald)' : 'var(--color-error-rose)' }}>
                  {signatureValid ? '✓ Valid' : '✗ Tampered'}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-accent-amber)' }}>No Corporate SOUL configured. Set one up to enable moral governance.</p>
          )}
        </div>
        <button className="btn btn-primary" onClick={onConfigureClick}>
          {version ? 'Update SOUL' : 'Configure SOUL'}
        </button>
      </div>
    </div>
  );
}
```

---

## STEP 8B: DomainHeatMap Component

**Create file: `src/components/features/moral/DomainHeatMap.tsx`**

```tsx
'use client';

import React from 'react';

interface DomainStats {
  domain: string;
  label: string;
  icon: string;
  pauseCount: number;
  blockCount: number;
}

interface DomainHeatMapProps {
  events: Array<{ domain: string; verdict: string }>;
}

export default function DomainHeatMap({ events }: DomainHeatMapProps) {
  const domains: DomainStats[] = [
    { domain: 'finance', label: 'Finance', icon: '💰', pauseCount: 0, blockCount: 0 },
    { domain: 'compliance', label: 'Compliance', icon: '📋', pauseCount: 0, blockCount: 0 },
    { domain: 'ip', label: 'IP Protection', icon: '🔒', pauseCount: 0, blockCount: 0 },
    { domain: 'comms', label: 'Communications', icon: '📧', pauseCount: 0, blockCount: 0 },
    { domain: 'security', label: 'Security', icon: '🛡️', pauseCount: 0, blockCount: 0 },
  ];

  // Aggregate counts from events
  events.forEach(e => {
    const d = domains.find(x => x.domain === e.domain);
    if (d) {
      if (e.verdict === 'pause') d.pauseCount++;
      if (e.verdict === 'block') d.blockCount++;
    }
  });

  const getSeverityColor = (pauses: number, blocks: number) => {
    const total = pauses + blocks * 3;
    if (total === 0) return 'var(--color-primary-emerald)';
    if (total < 5) return 'var(--color-info-cyan)';
    if (total < 15) return 'var(--color-accent-amber)';
    return 'var(--color-error-rose)';
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Domain Heat Map</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>Last 30 days</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {domains.map(d => (
          <div key={d.domain} style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${getSeverityColor(d.pauseCount, d.blockCount)}40`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>{d.icon}</span>
              <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{d.label}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-accent-amber)' }}>{d.pauseCount} paused</span>
              <span style={{ color: 'var(--color-error-rose)' }}>{d.blockCount} blocked</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## STEP 8C: MoralEventFeed Component

**Create file: `src/components/features/moral/MoralEventFeed.tsx`**

```tsx
'use client';

import React, { useState } from 'react';

interface MoralEventFeedProps {
  events: Array<{
    id: string;
    action_description: string;
    domain: string;
    verdict: string;
    conflict_reason?: string;
    agent_id: string;
    soul_version: number;
    oob_ticket_id?: string;
    created_at: string;
  }>;
  onFilterChange: (domain: string, verdict: string) => void;
}

export default function MoralEventFeed({ events, onFilterChange }: MoralEventFeedProps) {
  const [domainFilter, setDomainFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');

  const handleDomainChange = (val: string) => {
    setDomainFilter(val);
    onFilterChange(val === 'all' ? '' : val, verdictFilter === 'all' ? '' : verdictFilter);
  };

  const handleVerdictChange = (val: string) => {
    setVerdictFilter(val);
    onFilterChange(domainFilter === 'all' ? '' : domainFilter, val === 'all' ? '' : val);
  };

  const getVerdictBadge = (verdict: string) => {
    const colors: Record<string, string> = {
      clear: 'var(--color-primary-emerald)',
      pause: 'var(--color-accent-amber)',
      block: 'var(--color-error-rose)',
    };
    return (
      <span style={{
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: `${colors[verdict] || '#666'}20`,
        color: colors[verdict] || '#666',
        border: `1px solid ${colors[verdict] || '#666'}40`
      }}>
        {verdict.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Moral Event Feed</h3>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select
            className="form-input"
            style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem', appearance: 'none' }}
            value={domainFilter}
            onChange={e => handleDomainChange(e.target.value)}
          >
            <option value="all">All Domains</option>
            <option value="finance">Finance</option>
            <option value="compliance">Compliance</option>
            <option value="security">Security</option>
            <option value="comms">Comms</option>
            <option value="ip">IP</option>
          </select>
          <select
            className="form-input"
            style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem', appearance: 'none' }}
            value={verdictFilter}
            onChange={e => handleVerdictChange(e.target.value)}
          >
            <option value="all">All Verdicts</option>
            <option value="clear">Clear</option>
            <option value="pause">Pause</option>
            <option value="block">Block</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Action</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Domain</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Verdict</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Reason</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Agent</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No moral events recorded yet.</td></tr>
            ) : events.map(evt => (
              <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-glass)' }} className="animate-fade-in">
                <td style={{ padding: '0.75rem 0.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.action_description}</td>
                <td style={{ padding: '0.75rem 0.5rem', textTransform: 'capitalize' }}>{evt.domain}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{getVerdictBadge(evt.verdict)}</td>
                <td style={{ padding: '0.75rem 0.5rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{evt.conflict_reason || '—'}</td>
                <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{evt.agent_id.substring(0, 8)}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{new Date(evt.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## STEP 8D: SOULEditorModal Component

**Create file: `src/components/features/moral/SOULEditorModal.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ToastProvider';

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
    setIsSubmitting(true);
    try {
      const tenantId = localStorage.getItem('tl_tenant_id') || '7da27c93-6889-4fda-8b22-df4689fbbcd6';
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
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-accent-amber)', marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--color-accent-amber)', fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ Warning</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>This will update the Corporate SOUL for ALL agents in this tenant. The change is cryptographically signed and immutable.</p>
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
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => setShowConfirm(true)}>Review & Sign</button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## STEP 8E: Main MoralOS Dashboard Page

**Create file: `src/app/moral/page.tsx`**

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import SoulStatusCard from '@/components/features/moral/SoulStatusCard';
import MoralEventFeed from '@/components/features/moral/MoralEventFeed';
import DomainHeatMap from '@/components/features/moral/DomainHeatMap';
import SOULEditorModal from '@/components/features/moral/SOULEditorModal';

export default function MoralOSDashboard() {
  const { showToast } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [soulData, setSoulData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  const tenantId = typeof window !== 'undefined'
    ? localStorage.getItem('tl_tenant_id') || '7da27c93-6889-4fda-8b22-df4689fbbcd6'
    : '7da27c93-6889-4fda-8b22-df4689fbbcd6';

  const fetchData = async (domainFilter?: string, verdictFilter?: string) => {
    setLoading(true);
    try {
      // Fetch SOUL
      const soulRes = await fetch('/api/v1/moral?type=soul', { headers: { 'X-Tenant-Id': tenantId } });
      if (soulRes.ok) {
        setSoulData(await soulRes.json());
      } else {
        setSoulData(null);
      }

      // Fetch events
      let eventsUrl = '/api/v1/moral?type=events&limit=50';
      if (domainFilter) eventsUrl += `&domain=${domainFilter}`;
      if (verdictFilter) eventsUrl += `&verdict=${verdictFilter}`;
      const eventsRes = await fetch(eventsUrl, { headers: { 'X-Tenant-Id': tenantId } });
      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }
    } catch (e) {
      console.error('Failed to fetch MoralOS data:', e);
      showToast('Failed to load MoralOS data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (domain: string, verdict: string) => {
    fetchData(domain, verdict);
  };

  // Metrics
  const totalEvents = events.length;
  const pauseCount = events.filter(e => e.verdict === 'pause').length;
  const blockCount = events.filter(e => e.verdict === 'block').length;
  const clearRate = totalEvents > 0 ? Math.round(((totalEvents - pauseCount - blockCount) / totalEvents) * 100) : 100;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p>Loading MoralOS data...</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>MoralOS</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Corporate SOUL governance, moral conflict detection, and agent conscience engine.</p>
          </div>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>SOUL Version</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>{soulData ? `v${soulData.version}` : 'None'}</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Events</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalEvents}</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Blocks / Pauses</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--color-error-rose)' }}>{blockCount}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}> / </span>
              <span style={{ color: 'var(--color-accent-amber)' }}>{pauseCount}</span>
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Clear Rate</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary-emerald)' }}>{clearRate}%</p>
          </div>
        </div>

        {/* SOUL Status */}
        <SoulStatusCard
          version={soulData?.version || null}
          signedBy={soulData?.signed_by || '—'}
          createdAt={soulData?.created_at || ''}
          signatureValid={true}
          onConfigureClick={() => setIsEditorOpen(true)}
        />

        {/* Main Grid: Events + Heat Map */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <MoralEventFeed events={events} onFilterChange={handleFilterChange} />
          <DomainHeatMap events={events} />
        </div>
      </div>

      <SOULEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSuccess={() => fetchData()}
        currentSoul={soulData?.soul}
      />
    </>
  );
}
```

---

## FINAL VERIFICATION

After completing ALL steps (Part 1 + Part 2), run:

```bash
npm run build
```

Fix any TypeScript errors. Then:

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
1. **Sidebar** shows "S8 MoralOS" link
2. **Click "S8 MoralOS"** — dashboard loads with metrics, SOUL status, event feed, domain heat map
3. **Click "Configure SOUL"** — modal opens with 5 tabs (Financial, Compliance, Sensitive Data, Security, Authority)
4. **Fill in values and click "Review & Sign"** — confirmation step appears
5. **Design** matches existing RuneSignal aesthetic (dark charcoal, emerald/amber, glassmorphism)

### Run SQL migration in Supabase Dashboard:
Copy the contents of `supabase/migrations/009_moral_os.sql` and run it in the Supabase SQL Editor.

'use client';

import { useState, useEffect } from 'react';

interface Policy {
  allowed_regions: string[];
  blocked_providers: string[];
  auto_reroute: boolean;
  block_on_violation: boolean;
}

interface Provider {
  provider: string;
  model: string;
  region: string;
  gdpr_adequate: boolean;
  hipaa_eligible: boolean;
  pci_eligible: boolean;
  notes: string;
}

const REGION_CODES: Record<string, string> = {
  eu: 'EU', us: 'US', uk: 'UK', ap: 'AP', global: 'GL',
};

const REGION_LABELS: Record<string, string> = {
  eu: 'EU / EEA', us: 'United States', uk: 'United Kingdom', ap: 'Asia-Pacific', global: 'Global',
};

const DATA_CLASSES = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'PII', 'PHI'];
const ALL_REGIONS = ['eu', 'us', 'uk', 'ap', 'global'];

export default function SovereigntyPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [dataClass, setDataClass] = useState('INTERNAL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editRegions, setEditRegions] = useState<string[]>([]);
  const [blockOnViolation, setBlockOnViolation] = useState(true);
  const [autoReroute, setAutoReroute] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/sovereignty/policy').then(r => r.json()),
      fetch(`/api/v1/sovereignty/providers?data_classification=${dataClass}`).then(r => r.json()),
    ]).then(([policyRes, provRes]) => {
      const p = policyRes.policy;
      setPolicy(p);
      setEditRegions(p?.allowed_regions || []);
      setBlockOnViolation(p?.block_on_violation ?? true);
      setAutoReroute(p?.auto_reroute ?? false);
      setProviders(provRes.providers || []);
    }).finally(() => setLoading(false));
  }, [dataClass]);

  const savePolicy = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/sovereignty/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowed_regions: editRegions,
          block_on_violation: blockOnViolation,
          auto_reroute: autoReroute,
        }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally {
      setSaving(false);
    }
  };

  const toggleRegion = (r: string) => {
    setEditRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', color: 'var(--text-muted)' }}>Loading…</div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Data Residency</h1>
        <p className="page-description">
          Control which LLM providers and regions process your data. Enforce GDPR, HIPAA, and PCI-DSS requirements.
        </p>
      </div>

      {/* Policy Config Panel */}
      <div className="surface" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="panel-title">Residency Policy</span>
          <button
            className="btn btn-primary"
            onClick={savePolicy}
            disabled={saving || editRegions.length === 0}
            style={{ fontSize: '0.8rem' }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Policy'}
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Allowed Regions */}
          <div>
            <p className="form-label" style={{ marginBottom: '0.6rem' }}>Allowed Regions</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {ALL_REGIONS.map(r => {
                const active = editRegions.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() => toggleRegion(r)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
                      background: active ? 'var(--accent-dim)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: active ? 600 : 400,
                      transition: 'all var(--t-fast)',
                    }}
                    title={REGION_LABELS[r]}
                  >
                    {REGION_CODES[r]}
                    <span style={{ marginLeft: '0.4rem', fontWeight: 400, fontSize: '0.72rem', opacity: 0.75 }}>
                      {REGION_LABELS[r]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { label: 'Block on violation',                value: blockOnViolation, setter: setBlockOnViolation },
              { label: 'Auto-reroute to compliant provider', value: autoReroute,       setter: setAutoReroute },
            ].map(({ label, value, setter }) => (
              <label
                key={label}
                className="toggle-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  cursor: 'pointer', fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={e => setter(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Compliant Providers Panel */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="panel-title">Compliant Providers</span>

          {/* Data classification selector */}
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {DATA_CLASSES.map(c => (
              <button
                key={c}
                onClick={() => setDataClass(c)}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${dataClass === c ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                  background: dataClass === c ? 'var(--accent-dim)' : 'transparent',
                  color: dataClass === c ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: dataClass === c ? 700 : 400,
                  letterSpacing: '0.04em',
                  transition: 'all var(--t-fast)',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {providers.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No compliant providers</p>
            <p className="empty-state-body">No providers match the current policy and data classification.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  {['Provider', 'Model', 'Region', 'GDPR', 'HIPAA', 'PCI-DSS', 'Notes'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {providers.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.provider}</td>
                    <td>
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.model}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {p.region.toUpperCase()}
                    </td>
                    <td>
                      <span className={p.gdpr_adequate ? 'badge badge-success' : 'badge badge-neutral'}>
                        {p.gdpr_adequate ? '✓' : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={p.hipaa_eligible ? 'badge badge-success' : 'badge badge-neutral'}>
                        {p.hipaa_eligible ? '✓' : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={p.pci_eligible ? 'badge badge-success' : 'badge badge-neutral'}>
                        {p.pci_eligible ? '✓' : '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

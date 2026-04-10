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

const REGION_FLAGS: Record<string, string> = {
  eu: '🇪🇺', us: '🇺🇸', uk: '🇬🇧', ap: '🌏', global: '🌍',
};

const REGION_LABELS: Record<string, string> = {
  eu: 'EU / EEA', us: 'United States', uk: 'United Kingdom', ap: 'Asia-Pacific', global: 'Global',
};

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

  const ALL_REGIONS = ['eu', 'us', 'uk', 'ap', 'global'];

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

  if (loading) return <div style={{ padding: 40, color: '#737373' }}>Loading…</div>;

  return (
    <div style={{ padding: '2rem', color: '#e5e5e5', fontFamily: 'Inter, sans-serif', maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#10b981', marginBottom: 8 }}>S10</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>Sovereign AI Data Residency</h1>
        <p style={{ color: '#737373', margin: 0 }}>
          Control which LLM providers and regions can process your data. Enforce GDPR, HIPAA, and PCI-DSS data residency requirements.
        </p>
      </div>

      {/* Policy Config */}
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Data Residency Policy</h2>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#a3a3a3', marginBottom: 8 }}>Allowed Regions</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ALL_REGIONS.map(r => (
              <button
                key={r}
                onClick={() => toggleRegion(r)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: `1px solid ${editRegions.includes(r) ? '#10b981' : '#2a2a2a'}`,
                  background: editRegions.includes(r) ? '#064e3b' : 'transparent',
                  color: editRegions.includes(r) ? '#10b981' : '#737373',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {REGION_FLAGS[r]} {REGION_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
          {[
            { label: 'Block on violation', value: blockOnViolation, setter: setBlockOnViolation },
            { label: 'Auto-reroute to compliant provider', value: autoReroute, setter: setAutoReroute },
          ].map(({ label, value, setter }) => (
            <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={value} onChange={e => setter(e.target.checked)} />
              {label}
            </label>
          ))}
        </div>

        <button
          onClick={savePolicy}
          disabled={saving || editRegions.length === 0}
          style={{
            background: saved ? '#064e3b' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Policy'}
        </button>
      </div>

      {/* Compliant Providers */}
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Compliant Providers</h2>
          <select
            value={dataClass}
            onChange={e => setDataClass(e.target.value)}
            style={{ background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #2a2a2a', borderRadius: 4, padding: '4px 8px', fontSize: 12 }}
          >
            {['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'PII', 'PHI'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {providers.length === 0 ? (
          <p style={{ color: '#737373', fontSize: 13 }}>No compliant providers found for current policy and data classification.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                {['Provider', 'Model', 'Region', 'GDPR', 'HIPAA', 'PCI-DSS', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#737373', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.provider}</td>
                  <td style={{ padding: '10px 12px', color: '#a3a3a3', fontFamily: 'monospace', fontSize: 12 }}>{p.model}</td>
                  <td style={{ padding: '10px 12px' }}>{REGION_FLAGS[p.region] || '🌐'} {p.region.toUpperCase()}</td>
                  <td style={{ padding: '10px 12px' }}>{p.gdpr_adequate ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px 12px' }}>{p.hipaa_eligible ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px 12px' }}>{p.pci_eligible ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px 12px', color: '#737373', fontSize: 12 }}>{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';
import { useToast } from '@/components/ToastProvider';
import { createBrowserClient } from '@lib/db/supabase';

const PLANS = [
  {
    id: 'free',
    name: 'Developer',
    tier: 'T0',
    price: '€0',
    period: '',
    description: '1 tenant · 10K actions/month · 30-day retention.',
    features: ['1 tenant', '10,000 agent actions / month', '30-day audit log retention', 'Community support'],
    priceId: null,
    buttonText: 'Current Plan',
    highlight: false,
    accentColor: '#64748b',
  },
  {
    id: 'pro',
    name: 'Core',
    tier: 'T1',
    price: '€1,500',
    period: '/mo',
    description: 'Full runtime for production agent fleets.',
    features: ['Up to 2M agent actions / month', 'Ed25519 signing on every action', 'HITL Approval API + Slack/Jira', 'Anomaly detection + NHI lifecycle', 'Shadow AI + blast radius scoring', 'SDK + LangChain / CrewAI plugins', 'Priority support'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    buttonText: 'Upgrade to Core',
    highlight: true,
    accentColor: '#10b981',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Sovereign',
    tier: 'TE',
    price: 'Custom',
    period: '',
    description: 'Dedicated infra, BYO-HSM, PQC signatures, EU-only residency.',
    features: ['Everything in Core', 'Dedicated HA tenant', 'BYO-HSM + PQC (ML-DSA-65)', 'EU-only data residency', 'Co-signed Annex IV templates', 'SOC 2 Type II + GDPR DPA', 'Dedicated CSM'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    buttonText: 'Contact Sales',
    highlight: false,
    accentColor: '#7c3aed',
  },
];

const METERED_EVENTS = [
  { event: 'evidence_pack_signed',  label: 'Evidence Packs signed',      unit: 'pack',         color: '#f59e0b', tier: 'T2' },
  { event: 'ledger_replay',         label: 'Decision Ledger replays',     unit: 'query',        color: '#3b82f6', tier: 'T3' },
  { event: 'registry_verification', label: 'Passport verifications',      unit: 'verification', color: '#8b5cf6', tier: 'T4' },
  { event: 'passport_issued',       label: 'Agent Passports issued',      unit: 'passport',     color: '#ec4899', tier: 'T4' },
];

export default function BillingPage() {
  const { tenantId } = useTenant();
  const { showToast } = useToast();
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState({ monthly: 0, limit: 1000, percentage: 0 });
  const supabase = createBrowserClient();

  const [meteredUsage, setMeteredUsage] = useState<Record<string, number>>({});
  const [meteredLoading, setMeteredLoading] = useState(false);

  const fetchBillingStatus = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await supabase
        .from('tenants')
        .select('plan_tier, api_requests_monthly')
        .eq('id', tenantId)
        .single();
      if (data) {
        setCurrentTier(data.plan_tier);
        const limit = data.plan_tier === 'pro' ? 2000000 : data.plan_tier === 'enterprise' ? -1 : 10000;
        const monthly = data.api_requests_monthly || 0;
        setUsage({ monthly, limit, percentage: limit > 0 ? Math.min((monthly / limit) * 100, 100) : 0 });
      }
    } catch { /* ignore */ }
  }, [tenantId, supabase]);

  const fetchMeteredUsage = useCallback(async () => {
    if (!tenantId) return;
    setMeteredLoading(true);
    try {
      const res = await fetch('/api/v1/billing/usage?days=30', { headers: { 'X-Tenant-Id': tenantId } });
      if (res.ok) {
        const d = await res.json();
        const map: Record<string, number> = {};
        for (const e of d.events ?? []) map[e.event] = e.count;
        setMeteredUsage(map);
      }
    } catch { /* ignore */ } finally { setMeteredLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchBillingStatus(); fetchMeteredUsage(); }, [fetchBillingStatus, fetchMeteredUsage]);

  const handleUpgrade = async (priceId: string | null, planId: string) => {
    if (planId === 'free' && currentTier === 'free') return;
    if (planId === currentTier) return;
    if (!priceId && planId === 'enterprise') {
       window.location.href = 'mailto:sales@runesignal.io';
       return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Tenant-Id': tenantId || '',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        credentials: 'include',
        body: JSON.stringify({ priceId })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Failed to start checkout.', 'error');
      }
    } catch (err) {
      showToast('A network error occurred.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="page-title">Subscription &amp; Usage</h1>
        <p className="page-description">Manage your plan, monitor agent action consumption, and track Evidence Plane metered usage.</p>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {PLANS.map((plan) => {
          const isActive = plan.id === currentTier || (plan.id === 'free' && (currentTier === 'free' || currentTier === 'starter'));
          return (
            <div key={plan.id} className="surface" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', border: `1px solid ${isActive ? plan.accentColor : 'var(--border-default)'}`, borderRadius: 12, position: 'relative' }}>
              {isActive && (
                <div style={{ position: 'absolute', top: '-0.625rem', left: '1.25rem', background: plan.accentColor, color: '#fff', padding: '0.15rem 0.75rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', background: plan.accentColor + '22', color: plan.accentColor, border: `1px solid ${plan.accentColor}44`, borderRadius: 12, padding: '0.15rem 0.5rem' }}>{plan.tier}</span>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{plan.name}</span>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: plan.accentColor }}>{plan.price}</span>
                {plan.period && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{plan.period}</span>}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>{plan.description}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: plan.accentColor, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                className={`btn ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%' }}
                disabled={loading || isActive}
                onClick={() => handleUpgrade(plan.priceId || null, plan.id)}
              >
                {loading ? 'Processing…' : isActive ? 'Active Plan' : plan.buttonText}
              </button>
            </div>
          );
        })}
      </div>

      {/* Agent action quota */}
      <div className="surface" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '0.125rem' }}>Agent Action Quota</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Governance events processed this billing period</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{usage.monthly.toLocaleString()}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}> / {currentTier === 'enterprise' ? '∞' : usage.limit.toLocaleString()}</span>
          </div>
        </div>
        <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden', marginBottom: '0.5rem' }}>
          <div style={{ width: `${usage.percentage}%`, height: '100%', background: usage.percentage > 90 ? 'var(--danger)' : 'var(--success)', borderRadius: 4, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="t-caption">{usage.percentage.toFixed(1)}% utilised</span>
          <span className="t-caption">Resets each billing cycle</span>
        </div>
      </div>

      {/* Evidence Plane metered usage */}
      <div className="surface" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '0.125rem' }}>Evidence Plane — Metered Usage (last 30 days)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pay-per-use add-ons: T2 Evidence Packs · T3 Decision Ledger · T4 Agent Registry</div>
          </div>
          <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }} onClick={fetchMeteredUsage} disabled={meteredLoading}>
            {meteredLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
          {METERED_EVENTS.map(me => {
            const count = meteredUsage[me.event] ?? 0;
            return (
              <div key={me.event} style={{ padding: '0.875rem 1rem', background: 'var(--bg-surface-2, var(--surface-2))', borderRadius: 8, border: `1px solid ${me.color}33` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: me.color, background: me.color + '1a', borderRadius: 4, padding: '0.1rem 0.375rem' }}>{me.tier}</span>
                </div>
                <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '1.5rem', color: me.color, lineHeight: 1.1, marginBottom: '0.125rem' }}>{count.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{me.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          All prices in EUR. Evidence Packs: €0.05–€0.50/pack · Replays: €0.10–€1.00/query · Verifications: €0.02–€0.20/check · Passports: €1.00–€5.00 each.
        </div>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        All prices in EUR. Core plans billed monthly, cancel any time. Metered add-ons billed at end of billing period.
        Annual plans available at 20% discount — <a href="mailto:sales@runesignal.io" style={{ color: 'var(--accent)' }}>contact sales</a>.
      </div>
    </div>
  );
}

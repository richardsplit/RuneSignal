'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';
import { useToast } from '@/components/ToastProvider';
import { createBrowserClient } from '@lib/db/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// PRICE VISIBILITY POLICY
//   T0 Developer  — showPrice: false  (free tier)
//   T1 Core       — showPrice: true   ← ONLY plan with a public price
//   TE Enterprise — showPrice: false  (contact sales)
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free', tier: 'T0', name: 'Developer', showPrice: false, price: '', period: '',
    description: '1 tenant · 10K actions/month · 30-day retention.',
    features: ['1 tenant', '10,000 agent actions / month', '30-day audit log retention', 'Basic SLA monitoring', 'Community support'],
    priceId: null, buttonText: 'Start free', highlight: false,
  },
  {
    id: 'pro', tier: 'T1', name: 'Core', showPrice: true, price: '€1,500', period: '/mo',
    scalingNote: 'Scales to €6,000/mo by action volume.',
    description: 'Full runtime for production agent fleets.',
    features: ['Everything in Developer', 'Up to 2M agent actions / month', 'Ed25519-signed provenance on every action', 'HITL Approval API + blast radius scoring', 'Slack / Teams / ServiceNow / Jira adapters', 'SDK + LangChain / CrewAI plugins', 'EU AI Act evidence reports', 'Priority support'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID, buttonText: 'Upgrade to Core', highlight: true,
  },
  {
    id: 'enterprise', tier: 'TE', name: 'Enterprise Sovereign', showPrice: false, price: '', period: '',
    description: 'Dedicated infrastructure, BYO-HSM, PQC signatures, EU-only data residency.',
    features: ['Everything in Core', 'Dedicated high-availability tenant', 'Bring-your-own HSM signing', 'PQC signatures (ML-DSA-65)', 'EU-only data residency (S10)', 'SOC 2 Type II readiness pack', 'GDPR DPA + SLA guarantee', 'Dedicated CSM + Slack', 'Custom integrations'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID, buttonText: 'Contact Sales', highlight: false,
  },
];

/** Evidence Plane sub-meters shown inside the Evidence Packs dropdown */
const METERS = [
  { label: 'Evidence Pack Signed',    event: 'evidence_pack_signed',   unit: 'packs',     color: 'var(--accent)',   icon: '📦' },
  { label: 'Decision Ledger Replay',  event: 'decision_ledger_replay', unit: 'queries',   color: 'var(--info)',     icon: '🔁' },
  { label: 'Passport Verification',   event: 'passport_verification',  unit: 'checks',    color: 'var(--info)',     icon: '🛂' },
  { label: 'Passport Issued',         event: 'passport_issued',        unit: 'passports', color: 'var(--success)',  icon: '🪪' },
];

/** Add-on product definitions — prices shown in tier table, one CTA at bottom */
const ADDONS = [
  {
    tier: 'T2', name: 'Evidence Pack Add-On', accentColor: 'var(--accent)', accentBg: 'var(--accent-soft)', accentBorder: 'var(--accent-border)',
    badgeColor: 'var(--accent)',
    // showPricingOnRequest removed per policy
    priceSub: 'per signed Pack · volume-tiered',
    buyer: '👤 General Counsel · CRO · Head of AI Risk',
    trigger: { text: 'EU AI Act Art. 12 deadline: 2 August 2026', red: false },
    description: 'Metered add-on on top of Core. Volume-tiered. One regulated enterprise at 5M decisions/yr = €50K–€500K ARR.',
    features: ['EU AI Act Annex IV technical documentation', 'ISO/IEC 42001 management system pack', 'NIST AI RMF (Govern / Map / Measure / Manage)', 'Insurance Carrier evidence template', 'Cryptographically signed + hash-manifest', '10-year cold-storage retention tier', 'Export as JSON / PDF bundle', 'Notified body co-signing (TÜV / DNV / BSI) on Enterprise'],
    tiers: [['< 100 packs/mo', '€0.50 / pack'], ['100–999 packs/mo', '€0.20 / pack'], ['1K–9K packs/mo', '€0.10 / pack'], ['10K+ packs/mo', '€0.05 / pack']],
    cta: 'Talk to sales', ctaHref: 'mailto:sales@runesignal.io', ctaRed: false,
  },
  {
    tier: 'T3', name: 'Decision Ledger & Reversibility', accentColor: 'var(--info)', accentBg: 'var(--info-soft)', accentBorder: 'var(--info-border)',
    badgeColor: 'var(--info)',
    priceSub: 'ACV + per-query',
    buyer: '👤 Head of AI Ops · CRO · General Counsel',
    trigger: { text: 'Triggered by first material incident', red: false },
    description: 'Forensic replay API, outcome back-labelling, reversal orchestrator. Priced per-query on top of ACV.',
    features: ['Forensic replay: full reasoning chain per decision', 'Outcome back-labelling (accepted / rejected / reversed / litigated)', 'Webhook ingest from Jira, ServiceNow, insurance claims', 'Reversal orchestrator (refund / revoke / rollback / retract)', 'Decision outcome → SOUL policy feedback loop', 'Replay API: per-query (volume-tiered)', 'Retention: 7-year decision archive'],
    tiers: [['< 100 replays/mo', '€1.00 / query'], ['100–999 replays/mo', '€0.50 / query'], ['1K–9K replays/mo', '€0.20 / query'], ['10K+ replays/mo', '€0.10 / query']],
    cta: 'Talk to sales', ctaHref: 'mailto:sales@runesignal.io', ctaRed: false,
  },
  {
    tier: 'T4', name: 'Agent Passport Registry', accentColor: 'var(--info)', accentBg: 'var(--info-soft)', accentBorder: 'var(--info-border)',
    badgeColor: 'var(--info)',
    priceSub: 'ACV + per-verification',
    buyer: '👤 Platform Eng · CISO · Counterparty trust',
    trigger: { text: 'Consortium moat — 12+ mo cycle, long-term flywheel', red: true },
    description: 'Cross-org signed agent identity + capability attestation. Network-effect trust layer. Per-verification metering.',
    features: ['Signed Agent Passport (RS-XXXX-XXXX format)', 'W3C VC / SPIFFE-compatible capability attestation', 'Cross-org counterparty verification API', 'Reputation scorecard (incident / anomaly weighted)', 'Public registry browse + DID publishing', 'Revocation lists + suspension lifecycle', 'Verification API: per-check (volume-tiered)', 'Passport issuance: per-agent', 'IETF / W3MSE / OpenID AgentID standards-body presence'],
    tiers: [['< 1K verifications/mo', '€0.20 / verification'], ['1K–9K verifications/mo', '€0.10 / verification'], ['10K–99K verifications/mo', '€0.05 / verification'], ['1M+ verifications/mo', '€0.02 / verification']],
    cta: 'Talk to sales', ctaHref: 'mailto:sales@runesignal.io', ctaRed: false,
  },
  {
    tier: 'T-I', name: 'Insurance Carrier OEM', accentColor: 'var(--danger)', accentBg: 'var(--danger-soft)', accentBorder: 'var(--danger-border)',
    badgeColor: 'var(--danger)',
    priceSub: '+ revenue-share per insured agent',
    buyer: '👤 Reinsurer / Insurance Carrier',
    trigger: { text: 'Phase 9 — requires 3+ signed contracts to activate', red: false },
    // Platform fee label kept for T-I
    platformFee: true,
    description: 'Carrier embeds RuneSignal as the independent evidence plane in their AI-liability policy. Push adoption across their book of business.',
    features: ['White-label Evidence Pack generation for carrier book', 'Loss-event vs no-loss-event sampling template', 'Actuarial risk scoring per agent fleet', 'Co-branded carrier evidence portal', 'Revenue-share per insured agent per month', 'Carrier API for policy underwriting data', 'Custom SLA + dedicated infrastructure'],
    tiers: [],
    cta: 'Partner with us', ctaHref: 'mailto:sales@runesignal.io', ctaRed: true,
  },
];

interface MeterUsage { event: string; count: number; loading: boolean; }
interface UsageStats { agentActions: number; ledgerWrites: number; hitlReviews: number; }

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.8s ease-out' }} />
    </div>
  );
}

export default function BillingPage() {
  const { tenantId } = useTenant();
  const { showToast } = useToast();
  const [currentTier, setCurrentTier] = useState('free');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats>({ agentActions: 0, ledgerWrites: 0, hitlReviews: 0 });
  const [meterUsage, setMeterUsage] = useState<MeterUsage[]>(
    METERS.map((m) => ({ event: m.event, count: 0, loading: true }))
  );
  const supabase = createBrowserClient();

  // Plan limits per tier
  const limits = {
    agentActions: currentTier === 'enterprise' ? Infinity : currentTier === 'pro' || currentTier === 'core' ? 2_000_000 : 10_000,
    ledgerWrites: currentTier === 'enterprise' ? Infinity : currentTier === 'pro' || currentTier === 'core' ? 2_000_000 : 10_000,
    hitlReviews:  currentTier === 'enterprise' ? Infinity : currentTier === 'pro' || currentTier === 'core' ? Infinity : 50,
  };
  const isCoreOrAbove = currentTier === 'pro' || currentTier === 'core' || currentTier === 'enterprise';

  useEffect(() => {
    if (!tenantId) return;
    const fetchUsage = async () => {
      try {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('plan_tier, api_requests_monthly')
          .eq('id', tenantId)
          .single();
        if (tenant) {
          setCurrentTier(tenant.plan_tier || 'free');
          setUsageStats(prev => ({ ...prev, agentActions: tenant.api_requests_monthly || 0 }));
        }
        const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
        const [ledgerRes, hitlRes] = await Promise.all([
          supabase.from('audit_events').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', startOfMonth.toISOString()),
          supabase.from('hitl_exceptions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', startOfMonth.toISOString()),
        ]);
        setUsageStats(prev => ({ ...prev, ledgerWrites: ledgerRes.count ?? 0, hitlReviews: hitlRes.count ?? 0 }));
      } catch { /* non-fatal */ }
    };
    fetchUsage();
  }, [tenantId, supabase]);

  useEffect(() => {
    if (!tenantId || !isCoreOrAbove) return;
    Promise.allSettled(
      METERS.map((m) =>
        fetch(`/api/v1/billing/meter-usage?event=${m.event}`, { headers: { 'X-Tenant-Id': tenantId } })
          .then(r => r.json())
          .then(d => ({ event: m.event, count: (d.total as number) ?? 0, loading: false }))
          .catch(() => ({ event: m.event, count: 0, loading: false }))
      )
    ).then(results =>
      setMeterUsage(results.map(r => r.status === 'fulfilled' ? r.value : { event: '', count: 0, loading: false }))
    );
  }, [tenantId, isCoreOrAbove]);

  const handleUpgrade = async (priceId: string | null | undefined, planId: string) => {
    if (planId === 'free' && currentTier === 'free') return;
    if (planId === currentTier) return;
    if (!priceId && planId === 'enterprise') { window.location.href = 'mailto:sales@runesignal.io'; return; }
    if (!priceId) return;
    setCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId || '', Authorization: session ? `Bearer ${session.access_token}` : '' },
        credentials: 'include',
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast(data.error || 'Failed to start checkout.', 'error');
    } catch { showToast('A network error occurred.', 'error'); }
    finally { setCheckoutLoading(false); }
  };

  const activePlanLabel = currentTier === 'pro' || currentTier === 'core' ? 'pro' : currentTier === 'enterprise' ? 'enterprise' : 'free';

  const fmt = (n: number) => n === Infinity ? '∞' : n >= 1_000_000 ? `${(n/1_000_000).toFixed(0)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}K` : n.toLocaleString();

  return (
    <div style={{ maxWidth: '1200px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 className="page-title" style={{ fontSize: '2rem' }}>Subscription &amp; Usage</h1>
        <p className="page-description">Manage your plan and monitor real-time API and Evidence Plane consumption.</p>
      </div>

      {/* ── Plan cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {PLANS.map((plan) => {
          const isActive = plan.id === 'free' ? activePlanLabel === 'free' : plan.id === 'pro' ? activePlanLabel === 'pro' : activePlanLabel === 'enterprise';
          return (
            <div key={plan.id} className="surface" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', position: 'relative', border: `${plan.highlight ? '2px' : '1px'} solid ${plan.highlight ? 'var(--accent-border)' : 'var(--border-default)'}` }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'var(--text-inverse)', padding: '0.25rem 1rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Most Popular</div>
              )}
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>{plan.tier}</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{plan.name}</h2>
              <div style={{ marginBottom: '1.25rem', minHeight: '3rem' }}>
                {plan.showPrice ? (
                  <>
                    <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{plan.price}</span>
                    {plan.period && <span className="text-tertiary" style={{ fontSize: '1rem' }}>{plan.period}</span>}
                    {(plan as any).scalingNote && <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.3rem' }}>{(plan as any).scalingNote}</div>}
                  </>
                ) : (
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{plan.id === 'free' ? 'Free' : 'Contact sales →'}</span>
                )}
              </div>
              <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6', minHeight: '2.4rem' }}>{plan.description}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', fontSize: '0.875rem' }}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--success)" strokeWidth="3"><path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`btn ${plan.highlight ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', padding: '0.75rem' }} disabled={checkoutLoading || isActive} onClick={() => handleUpgrade(plan.priceId, plan.id)}>
                {checkoutLoading ? 'Processing…' : isActive ? 'Active Plan' : plan.buttonText}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Usage This Month ── */}
      <div className="surface" style={{ maxWidth: '860px', margin: '0 auto 3rem', padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.75rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Usage This Month</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Agent Actions */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Agent Actions</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                {usageStats.agentActions.toLocaleString()} / {fmt(limits.agentActions)}
              </span>
            </div>
            <ProgressBar value={usageStats.agentActions} max={limits.agentActions === Infinity ? 1 : limits.agentActions} color="var(--success)" />
          </div>

          {/* Audit Ledger Writes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Audit Ledger Writes</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                {usageStats.ledgerWrites.toLocaleString()} / {fmt(limits.ledgerWrites)}
              </span>
            </div>
            <ProgressBar value={usageStats.ledgerWrites} max={limits.ledgerWrites === Infinity ? 1 : limits.ledgerWrites} color="var(--info)" />
          </div>

          {/* HITL Reviews */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>HITL Reviews</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                {usageStats.hitlReviews} / {limits.hitlReviews === Infinity ? '∞' : limits.hitlReviews}
              </span>
            </div>
            <ProgressBar value={usageStats.hitlReviews} max={limits.hitlReviews === Infinity ? 1 : limits.hitlReviews} color="var(--warning)" />
          </div>

          {/* Evidence Packs — dropdown or locked */}
          <div>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCoreOrAbove && evidenceOpen ? '0.75rem' : 0, cursor: isCoreOrAbove ? 'pointer' : 'default' }}
              onClick={() => isCoreOrAbove && setEvidenceOpen(o => !o)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Evidence Packs</span>
                {isCoreOrAbove && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: evidenceOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--t-base)' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </div>
              {isCoreOrAbove ? (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                  {meterUsage.find(m => m.event === 'evidence_pack_signed')?.loading ? '…' : `${(meterUsage.find(m => m.event === 'evidence_pack_signed')?.count ?? 0).toLocaleString()} packs`}
                </span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>— Core plan required</span>
              )}
            </div>

            {/* Sub-meters dropdown */}
            {isCoreOrAbove && evidenceOpen && (
              <div style={{ borderLeft: '2px solid var(--border-subtle)', paddingLeft: '1rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {METERS.map((meter) => {
                  const mu = meterUsage.find(m => m.event === meter.event);
                  return (
                    <div key={meter.event}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>{meter.icon}</span>{meter.label}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                          {mu?.loading ? '…' : (mu?.count ?? 0).toLocaleString()} {meter.unit}
                        </span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: mu?.loading || !mu?.count ? '0%' : '60%', height: '100%', background: meter.color, borderRadius: '2px', transition: 'width 0.8s ease-out' }} />
                      </div>
                    </div>
                  );
                })}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.25rem 0 0', fontStyle: 'italic' }}>
                  Counts refresh every few minutes. Volume tiers applied per calendar month.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Metered Add-On Products ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>
            Metered Add-Ons — Evidence Plane
          </p>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Three products. Three buyers. Three budgets.</h2>
          <p className="page-description" style={{ marginBottom: 0 }}>Add-ons layer on top of Core. Contact sales to activate.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {ADDONS.map((addon) => (
            <div key={addon.tier} className="surface" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', borderTop: `3px solid ${addon.accentColor}` }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: addon.accentBg, color: addon.badgeColor, border: `1px solid ${addon.accentBorder}`, borderRadius: 'var(--radius-2xl)', padding: '0.2rem 0.55rem' }}>{addon.tier}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{addon.name}</span>
              </div>

              {/* Platform fee label for T-I only; priceSub for all */}
              {addon.platformFee && (
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Platform fee</div>
              )}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>{addon.priceSub}</div>

              {/* Buyer + trigger */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>{addon.buyer}</div>
              <span className={addon.trigger.red ? 'chip chip-danger' : 'chip chip-warning'} style={{ marginBottom: 'var(--space-3)', display: 'inline-block' }}>
                {addon.trigger.text}
              </span>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '1rem' }}>{addon.description}</p>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {addon.features.map(f => (
                  <li key={f} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>

              {/* Volume-tier price table — real prices, one CTA below */}
              {addon.tiers.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.875rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {addon.tiers.map(([vol, rate]) => (
                    <div key={vol} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>{vol}</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{rate}</span>
                    </div>
                  ))}
                </div>
              )}
              {addon.tiers.length === 0 && <div style={{ flex: 1 }} />}

              {/* Single CTA */}
              <a
                href={addon.ctaHref}
                className="btn btn-outline"
                style={{ textAlign: 'center', textDecoration: 'none', padding: '0.65rem', ...(addon.ctaRed ? { color: 'var(--danger)', borderColor: 'var(--danger-border)' } : {}) }}
              >
                {addon.cta}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-tertiary" style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.85rem' }}>
        <p>Core plan billed in EUR · monthly · cancel any time. Enterprise and add-on pricing on request.</p>
        <p style={{ marginTop: '0.5rem' }}>Automated fine-tuning and compliance reports included in Core / Enterprise Sovereign.</p>
      </div>
    </div>
  );
}

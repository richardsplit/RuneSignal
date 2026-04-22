'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';
import { useToast } from '@/components/ToastProvider';
import { createBrowserClient } from '@lib/db/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// PRICE VISIBILITY POLICY
//   T0 Developer     — showPrice: false  (free tier, no price anchor needed)
//   T1 Core          — showPrice: true   ← ONLY plan with a public price
//   TE Enterprise    — showPrice: false  (contact sales; hides €250k+ anchor)
// To change the displayed price update ONLY the T1 entry.
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    tier: 'T0',
    name: 'Developer',
    showPrice: false,
    // price: '€0',  ← intentionally hidden; shown as "Free" in CTA only
    price: '',
    period: '',
    description: '1 tenant · 10K actions/month · 30-day retention. Top-of-funnel adoption.',
    features: [
      '1 tenant',
      '10,000 agent actions / month',
      '30-day audit log retention',
      'Basic SLA monitoring',
      'Community support',
    ],
    priceId: null,
    buttonText: 'Start free',
    highlight: false,
  },
  {
    id: 'pro',
    tier: 'T1',
    name: 'Core',
    showPrice: true,
    price: '€1,500',
    period: '/mo',
    scalingNote: 'Scales to €6,000/mo by action volume.',
    description: 'Full runtime for production agent fleets.',
    features: [
      'Everything in Developer',
      'Up to 2M agent actions / month',
      'Ed25519-signed provenance on every action',
      'HITL Approval API + blast radius scoring',
      'Slack / Teams / ServiceNow / Jira adapters',
      'SDK + LangChain / CrewAI plugins',
      'EU AI Act evidence reports',
      'Priority support',
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    buttonText: 'Upgrade to Core',
    highlight: true,
  },
  {
    id: 'enterprise',
    tier: 'TE',
    name: 'Enterprise Sovereign',
    showPrice: false,
    // price: '€250,000+',  ← intentionally hidden; prospects must contact sales
    price: '',
    period: '/year',
    description: 'Dedicated infrastructure, BYO-HSM, PQC signatures, EU-only data residency.',
    features: [
      'Everything in Core',
      'Dedicated high-availability tenant',
      'Bring-your-own HSM signing',
      'PQC signatures (ML-DSA-65)',
      'EU-only data residency (S10)',
      'SOC 2 Type II readiness pack',
      'GDPR DPA + SLA guarantee',
      'Dedicated CSM + Slack',
      'Custom integrations',
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    buttonText: 'Contact Sales',
    highlight: false,
  },
];

/** Evidence Plane meters — event_name must match exactly what is sent to Stripe */
const METERS = [
  {
    label: 'Evidence Pack Signed',
    event: 'evidence_pack_signed',
    unit: 'packs',
    tiers: '€0.50 · €0.20 · €0.10 · €0.05',
    color: '#6366f1',
    icon: '📦',
  },
  {
    label: 'Decision Ledger Replay',
    event: 'decision_ledger_replay',
    unit: 'queries',
    tiers: '€1.00 · €0.50 · €0.20 · €0.10',
    color: '#8b5cf6',
    icon: '🔁',
  },
  {
    label: 'Passport Verification',
    event: 'passport_verification',
    unit: 'checks',
    tiers: '€0.20 · €0.10 · €0.05 · €0.02',
    color: '#06b6d4',
    icon: '🛂',
  },
  {
    label: 'Passport Issued',
    event: 'passport_issued',
    unit: 'passports',
    tiers: '€5.00 · €3.00 · €1.00',
    color: '#10b981',
    icon: '🪪',
  },
];

interface MeterUsage {
  event: string;
  count: number;
  loading: boolean;
}

export default function BillingPage() {
  const { tenantId } = useTenant();
  const { showToast } = useToast();
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState({ monthly: 0, limit: 1000, percentage: 0 });
  const [meterUsage, setMeterUsage] = useState<MeterUsage[]>(
    METERS.map((m) => ({ event: m.event, count: 0, loading: true }))
  );
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchBillingStatus = async () => {
      if (!tenantId) return;
      try {
        const { data } = await supabase
          .from('tenants')
          .select('plan_tier, api_requests_monthly')
          .eq('id', tenantId)
          .single();

        if (data) {
          setCurrentTier(data.plan_tier || 'free');
          const limit =
            data.plan_tier === 'pro' || data.plan_tier === 'core'
              ? 100_000
              : data.plan_tier === 'enterprise'
              ? 10_000_000
              : 1_000;
          const monthly = data.api_requests_monthly || 0;
          setUsage({ monthly, limit, percentage: Math.min((monthly / limit) * 100, 100) });
        }
      } catch {
        // non-fatal
      }
    };
    fetchBillingStatus();
  }, [tenantId, supabase]);

  /** Fetch per-meter counts from Stripe Billing Meter summaries via our API */
  useEffect(() => {
    if (!tenantId) return;
    const fetchMeters = async () => {
      const results = await Promise.allSettled(
        METERS.map((m) =>
          fetch(`/api/v1/billing/meter-usage?event=${m.event}`, {
            headers: { 'X-Tenant-Id': tenantId },
          })
            .then((r) => r.json())
            .then((d) => ({ event: m.event, count: (d.total as number) ?? 0, loading: false }))
            .catch(() => ({ event: m.event, count: 0, loading: false }))
        )
      );
      setMeterUsage(
        results.map((r) =>
          r.status === 'fulfilled' ? r.value : { event: '', count: 0, loading: false }
        )
      );
    };
    fetchMeters();
  }, [tenantId]);

  const handleUpgrade = async (priceId: string | null | undefined, planId: string) => {
    if (planId === 'free' && currentTier === 'free') return;
    if (planId === currentTier) return;

    if (!priceId && planId === 'enterprise') {
      window.location.href = 'mailto:sales@runesignal.dev';
      return;
    }

    if (!priceId) return;

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId || '',
          Authorization: session ? `Bearer ${session.access_token}` : '',
        },
        credentials: 'include',
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Failed to start checkout.', 'error');
      }
    } catch {
      showToast('A network error occurred.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activePlanLabel =
    currentTier === 'pro' || currentTier === 'core'
      ? 'pro'
      : currentTier === 'enterprise'
      ? 'enterprise'
      : 'free';

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 className="page-title" style={{ fontSize: '2rem' }}>
          Subscription &amp; Usage
        </h1>
        <p className="page-description">
          Manage your plan and monitor real-time API and Evidence Plane consumption.
        </p>
      </div>

      {/* ── Plan cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem',
        }}
      >
        {PLANS.map((plan) => {
          const isActive =
            plan.id === 'free'
              ? activePlanLabel === 'free'
              : plan.id === 'pro'
              ? activePlanLabel === 'pro'
              : activePlanLabel === 'enterprise';

          return (
            <div
              key={plan.id}
              className="surface"
              style={{
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: `${plan.highlight ? '2px' : '1px'} solid ${
                  plan.highlight ? 'var(--accent-border)' : 'var(--border-default)'
                }`,
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-0.75rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent)',
                    color: 'var(--text-inverse)',
                    padding: '0.25rem 1rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Most Popular
                </div>
              )}

              {/* Tier badge */}
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.2rem' }}>
                {plan.tier}
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {plan.name}
              </h2>

              {/* Price — visible only for T1 Core */}
              <div style={{ marginBottom: '1.25rem', minHeight: '3rem' }}>
                {plan.showPrice ? (
                  <>
                    <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{plan.price}</span>
                    {plan.period && (
                      <span className="text-tertiary" style={{ fontSize: '1rem' }}>{plan.period}</span>
                    )}
                    {(plan as any).scalingNote && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.3rem' }}>
                        {(plan as any).scalingNote}
                      </div>
                    )}
                  </>
                ) : (
                  /* T0 / TE: price intentionally hidden — free tier or contact-sales */
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {plan.id === 'free' ? 'Free' : 'Contact sales →'}
                  </span>
                )}
              </div>
              <p
                className="text-secondary"
                style={{
                  fontSize: '0.9rem',
                  marginBottom: '2rem',
                  lineHeight: '1.6',
                  minHeight: '3.2rem',
                }}
              >
                {plan.description}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', flex: 1 }}>
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                      fontSize: '0.9rem',
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="var(--success)"
                      strokeWidth="3"
                    >
                      <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`btn ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', padding: '0.75rem' }}
                disabled={loading || isActive}
                onClick={() => handleUpgrade(plan.priceId, plan.id)}
              >
                {loading ? 'Processing…' : isActive ? 'Active Plan' : plan.buttonText}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Monthly API Consumption ── */}
      <div
        className="surface"
        style={{ maxWidth: '860px', margin: '0 auto 3rem', padding: '2rem' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Monthly API Consumption
            </h2>
            <p className="page-description" style={{ marginBottom: 0 }}>
              Governance API requests for the current billing period.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {usage.monthly.toLocaleString()}
            </span>
            <span className="text-tertiary" style={{ fontSize: '0.9rem' }}>
              {' '}
              / {currentTier === 'enterprise' ? '∞' : usage.limit.toLocaleString()} calls
            </span>
          </div>
        </div>

        <div
          style={{
            height: '12px',
            background: 'var(--surface-3)',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '1rem',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: `${usage.percentage}%`,
              height: '100%',
              background: usage.percentage > 90 ? 'var(--danger)' : 'var(--success)',
              transition: 'width 1s ease-out',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="t-caption">Utilization: {usage.percentage.toFixed(1)}%</span>
          <span className="t-caption">Cycle resets in 14 days</span>
        </div>
      </div>

      {/* ── Evidence Plane Metered Usage ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto 3rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          Evidence Plane — Metered Usage
        </h2>
        <p className="page-description" style={{ marginBottom: '1.5rem' }}>
          Pay-as-you-go consumption billed via Stripe Billing Meters. Volume tiers apply
          automatically.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {METERS.map((meter, i) => {
            const mu = meterUsage.find((m) => m.event === meter.event);
            const count = mu?.count ?? 0;
            const isLoading = mu?.loading ?? true;

            return (
              <div
                key={meter.event}
                className="surface"
                style={{ padding: '1.5rem', borderTop: `3px solid ${meter.color}` }}
              >
                <div
                  style={{
                    fontSize: '1.75rem',
                    marginBottom: '0.5rem',
                    lineHeight: 1,
                  }}
                >
                  {meter.icon}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: meter.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem',
                  }}
                >
                  {meter.label}
                </div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    marginBottom: '0.25rem',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {isLoading ? (
                    <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                  ) : (
                    count.toLocaleString()
                  )}
                </div>
                <div className="t-caption" style={{ marginBottom: '0.75rem' }}>
                  {meter.unit} this month
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary)',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.75rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {meter.tiers}
                </div>
              </div>
            );
          })}
        </div>

        <p
          className="t-caption"
          style={{ marginTop: '1rem', color: 'var(--text-tertiary)' }}
        >
          Counts refresh every few minutes. Volume pricing tiers are applied per calendar month.
        </p>
      </div>

      {/* ── Metered Add-On Products ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6366f1', marginBottom: '0.5rem' }}>
            Metered Add-Ons — Evidence Plane
          </p>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Three products. Three buyers. Three budgets.
          </h2>
          <p className="page-description" style={{ marginBottom: 0 }}>
            Add-ons layer on top of Core. Prices on request — contact sales to activate.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>

          {/* T2 — Evidence Pack Add-On */}
          <div className="surface" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', borderTop: '3px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', padding: '0.2rem 0.55rem' }}>T2</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Evidence Pack Add-On</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '0.2rem' }}>Pricing on request</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>per signed Pack · volume-tiered</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>👤 General Counsel · CRO · Head of AI Risk</div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px', padding: '0.2rem 0.5rem', marginBottom: '0.75rem', display: 'inline-block', width: 'fit-content' }}>
              EU AI Act Art. 12 deadline: 2 August 2026
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '1rem' }}>
              Metered add-on on top of Core. Volume-tiered. One regulated enterprise at 5M decisions/yr = €50K–€500K ARR.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {['EU AI Act Annex IV technical documentation', 'ISO/IEC 42001 management system pack', 'NIST AI RMF (Govern / Map / Measure / Manage)', 'Insurance Carrier evidence template', 'Cryptographically signed + hash-manifest', '10-year cold-storage retention tier', 'Export as JSON / PDF bundle', 'Notified body co-signing (TÜV / DNV / BSI) on Enterprise'].map(f => (
                <li key={f} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[['< 100 packs/mo', 'Talk to sales'], ['100–999 packs/mo', 'Talk to sales'], ['1K–9K packs/mo', 'Talk to sales'], ['10K+ packs/mo', 'Talk to sales']].map(([vol, rate]) => (
                <div key={vol} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{vol}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{rate}</span>
                </div>
              ))}
            </div>
            <a href="mailto:sales@runesignal.io" className="btn btn-outline" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.65rem' }}>Talk to sales</a>
          </div>

          {/* T3 — Decision Ledger & Reversibility */}
          <div className="surface" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', borderTop: '3px solid #8b5cf6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px', padding: '0.2rem 0.55rem' }}>T3</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Decision Ledger &amp; Reversibility</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '0.2rem' }}>Pricing on request</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>ACV + per-query</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>👤 Head of AI Ops · CRO · General Counsel</div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px', padding: '0.2rem 0.5rem', marginBottom: '0.75rem', display: 'inline-block', width: 'fit-content' }}>
              Triggered by first material incident
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '1rem' }}>
              Forensic replay API, outcome back-labelling, reversal orchestrator. Priced per-query on top of ACV.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {['Forensic replay: full reasoning chain per decision', 'Outcome back-labelling (accepted / rejected / reversed / litigated)', 'Webhook ingest from Jira, ServiceNow, insurance claims', 'Reversal orchestrator (refund / revoke / rollback / retract)', 'Decision outcome → SOUL policy feedback loop', 'Replay API: per-query (volume-tiered)', 'Retention: 7-year decision archive'].map(f => (
                <li key={f} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[['< 100 replays/mo', 'Talk to sales'], ['100–999 replays/mo', 'Talk to sales'], ['1K–9K replays/mo', 'Talk to sales'], ['10K+ replays/mo', 'Talk to sales']].map(([vol, rate]) => (
                <div key={vol} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{vol}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{rate}</span>
                </div>
              ))}
            </div>
            <a href="mailto:sales@runesignal.io" className="btn btn-outline" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.65rem' }}>Talk to sales</a>
          </div>

          {/* T4 — Agent Passport Registry */}
          <div className="surface" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', borderTop: '3px solid #06b6d4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '20px', padding: '0.2rem 0.55rem' }}>T4</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Agent Passport Registry</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '0.2rem' }}>Pricing on request</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>ACV + per-verification</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>👤 Platform Eng · CISO · Counterparty trust</div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '4px', padding: '0.2rem 0.5rem', marginBottom: '0.75rem', display: 'inline-block', width: 'fit-content' }}>
              Consortium moat — 12+ mo cycle, long-term flywheel
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '1rem' }}>
              Cross-org signed agent identity + capability attestation. Network-effect trust layer. Per-verification metering.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {['Signed Agent Passport (RS-XXXX-XXXX format)', 'W3C VC / SPIFFE-compatible capability attestation', 'Cross-org counterparty verification API', 'Reputation scorecard (incident / anomaly weighted)', 'Public registry browse + DID publishing', 'Revocation lists + suspension lifecycle', 'Verification API: per-check (volume-tiered)', 'Passport issuance: per-agent', 'IETF / W3MSE / OpenID AgentID standards-body presence'].map(f => (
                <li key={f} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[['< 1K verifications/mo', 'Talk to sales'], ['1K–9K verifications/mo', 'Talk to sales'], ['10K–99K verifications/mo', 'Talk to sales'], ['1M+ verifications/mo', 'Talk to sales']].map(([vol, rate]) => (
                <div key={vol} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{vol}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{rate}</span>
                </div>
              ))}
            </div>
            <a href="mailto:sales@runesignal.io" className="btn btn-outline" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.65rem' }}>Talk to sales</a>
          </div>

          {/* T-I — Insurance Carrier OEM */}
          <div className="surface" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', borderTop: '3px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '0.2rem 0.55rem' }}>T-I</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Insurance Carrier OEM</span>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '0.2rem' }}>Platform fee</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>+ revenue-share per insured agent</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>👤 Reinsurer / Insurance Carrier</div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px', padding: '0.2rem 0.5rem', marginBottom: '0.75rem', display: 'inline-block', width: 'fit-content' }}>
              Phase 9 — requires 3+ signed contracts to activate
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '1rem' }}>
              Carrier embeds RuneSignal as the independent evidence plane in their AI-liability policy. Push adoption across their book of business.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {['White-label Evidence Pack generation for carrier book', 'Loss-event vs no-loss-event sampling template', 'Actuarial risk scoring per agent fleet', 'Co-branded carrier evidence portal', 'Revenue-share per insured agent per month', 'Carrier API for policy underwriting data', 'Custom SLA + dedicated infrastructure'].map(f => (
                <li key={f} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <div style={{ flex: 1 }} />
            <a href="mailto:sales@runesignal.io" className="btn btn-outline" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.65rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}>Partner with us</a>
          </div>

        </div>
      </div>

      {/* ── Footer note ── */}
      <div
        className="text-tertiary"
        style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.85rem' }}
      >
        <p>Core plan billed in EUR · monthly · cancel any time. Enterprise pricing on request.</p>
        <p style={{ marginTop: '0.5rem' }}>
          Automated fine-tuning and compliance reports included in Core / Enterprise Sovereign.
        </p>
      </div>
    </div>
  );
}

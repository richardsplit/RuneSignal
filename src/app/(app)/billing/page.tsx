'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';
import { useToast } from '@/components/ToastProvider';
import { createBrowserClient } from '@lib/db/supabase';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: '/mo',
    description: 'Explore RuneSignal governance with no commitment.',
    features: [
      'Up to 3 Agentic Workers',
      'Standard Audit Logging (7 days)',
      'Basic SLA Monitoring',
      'Community Support',
    ],
    priceId: null,
    buttonText: 'Current Plan',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'RuneSignal Core',
    price: '€1,500',
    period: '/mo',
    description: 'Advanced governance for production agent fleets.',
    features: [
      'Unlimited agents',
      'HITL Approval API + blast radius scoring',
      'Shadow AI discovery',
      'Slack / Teams / ServiceNow / Jira adapters',
      'SDK + LangChain plugin',
      'EU AI Act evidence reports',
      'Priority support',
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    buttonText: 'Upgrade to Core',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Sovereign',
    price: 'Custom',
    period: '',
    description: 'Hardened compliance for global operations. From €250k/yr.',
    features: [
      'Dedicated High-Availability Node',
      'On-Premise GRC Integration',
      'SOC2 / HIPAA / ISO 42001 Readiness Pack',
      'Custom data residency (EU sovereign)',
      'White-Label Dashboards',
      '24/7 Phone Support',
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

              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {plan.name}
              </h2>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{plan.price}</span>
                {plan.period && (
                  <span className="text-tertiary" style={{ fontSize: '1rem' }}>
                    {plan.period}
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

      {/* ── Footer note ── */}
      <div
        className="text-tertiary"
        style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.85rem' }}
      >
        <p>All prices are in EUR. Subscriptions are billed monthly and can be cancelled any time.</p>
        <p style={{ marginTop: '0.5rem' }}>
          Automated fine-tuning and compliance reports included in Core / Enterprise.
        </p>
      </div>
    </div>
  );
}

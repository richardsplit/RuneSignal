'use client';

import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Pricing page — plan data
//
// PRICE VISIBILITY POLICY:
//   T0 (Developer) — price hidden; free tier, drives top-of-funnel sign-ups
//   T1 (Core)      — price shown: €1,500/mo  ← only public price
//   TE (Enterprise) — price hidden; prospects must contact sales
//
// To update prices update ONLY the T1 entry below.
// ─────────────────────────────────────────────────────────────────────────────

const plans = [
  {
    tier: 'T0',
    name: 'Developer',
    showPrice: false,
    period: '',
    description: '1 tenant · 10K actions/month · 30-day retention. Top-of-funnel adoption.',
    features: [
      '1 tenant',
      '10,000 agent actions / month',
      '30-day audit log retention',
      'Basic SLA monitoring',
      'Community support',
      'No Evidence Packs',
      'No A2A cross-org',
    ],
    cta: 'Start free',
    ctaHref: '/login?mode=signup',
    highlight: false,
    badge: null,
  },
  {
    tier: 'T1',
    name: 'Core',
    showPrice: true,
    price: '€1,500',
    period: '/mo',
    scalingNote: 'Starts at €1,500/mo, scales to €6,000/mo by action volume.',
    description: 'Full runtime for production agent fleets.',
    features: [
      'Everything in Developer',
      'Up to 2M agent actions / month',
      '30-day audit ledger (rolling)',
      'Ed25519-signed provenance on every action',
      'HITL Approval API + Slack / ServiceNow / Jira',
      'Anomaly detection (Welford Z-score)',
      'Agent FinOps budget guardrails',
      'NHI lifecycle management',
      'Shadow AI discovery',
      'Blast radius scoring',
      'SDK + LangChain / CrewAI plugins',
      'Priority support',
    ],
    cta: 'Start Core trial',
    ctaHref: '/login?mode=signup',
    highlight: true,
    badge: 'Most popular',
  },
  {
    tier: 'TE',
    name: 'Enterprise Sovereign',
    showPrice: false,
    period: '/year',
    description: 'Dedicated infrastructure, BYO-HSM, post-quantum signatures, EU-only data residency, co-signed notified body templates.',
    features: [
      'Everything in Core',
      'Dedicated high-availability tenant',
      'Bring-your-own HSM signing',
      'PQC signatures (ML-DSA-65) activated',
      'EU-only data residency (S10)',
      'Custom Annex IV template co-signed by notified body',
      'GDPR DPA + SLA guarantee',
      'SOC 2 Type II readiness pack',
      'Dedicated CSM + Slack',
      'Custom integrations',
    ],
    cta: 'Contact sales',
    ctaHref: 'mailto:sales@runesignal.io',
    highlight: false,
    badge: null,
  },
];

const addons = [
  {
    tier: 'T2',
    name: 'Evidence Pack Add-On',
    priceSub: 'per signed Pack · volume-tiered',
    buyers: '👤 General Counsel · CRO · Head of AI Risk',
    trigger: 'EU AI Act Art. 12 deadline: 2 August 2026',
    triggerRed: false,
    desc: 'Metered add-on on top of Core. Volume-tiered. One regulated enterprise at 5M decisions/yr = €50K–€500K ARR.',
    features: [
      'EU AI Act Annex IV technical documentation',
      'ISO/IEC 42001 management system pack',
      'NIST AI RMF (Govern / Map / Measure / Manage)',
      'Insurance Carrier evidence template',
      'Cryptographically signed + hash-manifest',
      '10-year cold-storage retention tier',
      'Export as JSON / PDF bundle',
      'Notified body co-signing (TÜV / DNV / BSI) on Enterprise',
    ],
    tiers: [
      ['< 100 packs/mo',   '€0.50 / pack'],
      ['100–999 packs/mo', '€0.20 / pack'],
      ['1K–9K packs/mo',   '€0.10 / pack'],
      ['10K+ packs/mo',    '€0.05 / pack'],
    ],
    cta: 'Talk to sales',
    ctaHref: 'mailto:sales@runesignal.io',
    oem: false,
  },
  {
    tier: 'T3',
    name: 'Decision Ledger & Reversibility',
    priceSub: 'ACV + per-query',
    buyers: '👤 Head of AI Ops · CRO · General Counsel',
    trigger: 'Triggered by first material incident',
    triggerRed: false,
    desc: 'Forensic replay API, outcome back-labelling, reversal orchestrator. Priced per-query on top of ACV.',
    features: [
      'Forensic replay: full reasoning chain per decision',
      'Outcome back-labelling (accepted / rejected / reversed / litigated)',
      'Webhook ingest from Jira, ServiceNow, insurance claims',
      'Reversal orchestrator (refund / revoke / rollback / retract)',
      'Decision outcome → SOUL policy feedback loop',
      'Replay API: per-query (volume-tiered)',
      'Retention: 7-year decision archive',
    ],
    tiers: [
      ['< 100 replays/mo',   '€1.00 / query'],
      ['100–999 replays/mo', '€0.40 / query'],
      ['1K–9K replays/mo',   '€0.15 / query'],
      ['10K+ replays/mo',    '€0.08 / query'],
    ],
    cta: 'Talk to sales',
    ctaHref: 'mailto:sales@runesignal.io',
    oem: false,
  },
  {
    tier: 'T4',
    name: 'Agent Passport Registry',
    priceSub: 'ACV + per-verification',
    buyers: '👤 Platform Eng · CISO · Counterparty trust',
    trigger: 'Consortium moat — 12+ mo cycle, long-term flywheel',
    triggerRed: true,
    desc: 'Cross-org signed agent identity + capability attestation. Network-effect trust layer. Per-verification metering.',
    features: [
      'Signed Agent Passport (RS-XXXX-XXXX format)',
      'W3C VC / SPIFFE-compatible capability attestation',
      'Cross-org counterparty verification API',
      'Reputation scorecard (incident / anomaly weighted)',
      'Public registry browse + DID publishing',
      'Revocation lists + suspension lifecycle',
      'Verification API: per-check (volume-tiered)',
      'Passport issuance: per-agent',
      'IETF / W3MSE / OpenID AgentID standards-body presence',
    ],
    tiers: [
      ['< 1K verifications/mo',    '€0.20 / verification'],
      ['1K–9K verifications/mo',   '€0.08 / verification'],
      ['10K–99K verifications/mo', '€0.03 / verification'],
      ['1M+ verifications/mo',     '€0.01 / verification'],
    ],
    cta: 'Talk to sales',
    ctaHref: 'mailto:sales@runesignal.io',
    oem: false,
  },
  {
    tier: 'T-I',
    name: 'Insurance Carrier OEM',
    priceSub: '+ revenue-share per insured agent',
    buyers: '👤 Reinsurer / Insurance Carrier',
    trigger: 'Phase 9 — requires 3+ signed contracts to activate',
    triggerRed: false,
    desc: 'Carrier embeds RuneSignal as the independent evidence plane in their AI-liability policy. Push adoption across their book of business.',
    features: [
      'White-label Evidence Pack generation for carrier book',
      'Loss-event vs no-loss-event sampling template',
      'Actuarial risk scoring per agent fleet',
      'Co-branded carrier evidence portal',
      'Revenue-share per insured agent per month',
      'Carrier API for policy underwriting data',
      'Custom SLA + dedicated infrastructure',
    ],
    tiers: [],
    cta: 'Partner with us',
    ctaHref: 'mailto:sales@runesignal.io',
    oem: true,
  },
];

const comparisonFeatures = [
  { label: 'Agents',                         t0: '1 tenant',      t1: 'Unlimited',       te: 'Unlimited' },
  { label: 'Agent actions / month',          t0: '10K',           t1: 'Up to 2M',        te: 'Custom' },
  { label: 'Audit log retention',            t0: '30 days',       t1: '30 days rolling', te: 'Custom' },
  { label: 'Ed25519-signed provenance',      t0: '—',             t1: '✓',               te: '✓' },
  { label: 'HITL Approval API',              t0: '—',             t1: '✓',               te: '✓' },
  { label: 'Anomaly detection',              t0: '—',             t1: '✓',               te: '✓' },
  { label: 'Agent FinOps guardrails',        t0: '—',             t1: '✓',               te: '✓' },
  { label: 'Shadow AI discovery',            t0: '—',             t1: '✓',               te: '✓' },
  { label: 'Blast radius scoring',           t0: '—',             t1: '✓',               te: '✓' },
  { label: 'SDK access',                     t0: '—',             t1: '✓',               te: '✓' },
  { label: 'Slack / ServiceNow / Jira',      t0: '—',             t1: '✓',               te: '✓' },
  { label: 'PQC signatures (ML-DSA-65)',     t0: '—',             t1: '—',               te: '✓' },
  { label: 'EU-only data residency',         t0: '—',             t1: '—',               te: '✓' },
  { label: 'BYO-HSM signing',               t0: '—',             t1: '—',               te: '✓' },
  { label: 'Dedicated infrastructure',       t0: '—',             t1: '—',               te: '✓' },
  { label: 'SOC 2 Type II readiness',        t0: '—',             t1: '—',               te: '✓' },
  { label: 'GDPR DPA + SLA guarantee',       t0: '—',             t1: '—',               te: '✓' },
  { label: 'Notified body template signing', t0: '—',             t1: '—',               te: '✓' },
  { label: 'Support',                        t0: 'Community',     t1: 'Priority',        te: 'Dedicated CSM' },
];

const faqs = [
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Yes. The Core plan is billed monthly with no long-term commitment. You can upgrade or downgrade from your account settings and changes take effect at the start of the next billing cycle.',
  },
  {
    q: 'Is there a free trial for Core?',
    a: 'Yes. Core comes with a 14-day free trial — no credit card required. You get full access to every Core feature from day one.',
  },
  {
    q: "What counts as an 'agent action'?",
    a: 'Any governed operation processed by the RuneSignal runtime: HITL decisions, provenance certificates, intent mediations, anomaly checks, and FinOps budget evaluations each count as one action.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes. Annual Core plans come with a 15% discount compared to monthly billing. Contact us or switch in your billing settings.',
  },
  {
    q: 'How is Enterprise pricing structured?',
    a: 'Enterprise Sovereign is scoped per deployment and quoted based on action volume, data residency requirements, and notified-body co-signing needs. Contact sales for a tailored ACV proposal.',
  },
];

export default function PricingPage() {
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set());

  function toggleFaq(i: number) {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <>
      <style jsx global>{`
        .pricing-hero { text-align: center; padding: 5rem 1.5rem 3.5rem; }
        .pricing-hero h1 { font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 800; letter-spacing: -0.04em; color: #f8fafc; line-height: 1.1; }
        .pricing-hero p { margin-top: 1rem; font-size: 1.125rem; color: #94a3b8; max-width: 480px; margin-left: auto; margin-right: auto; }
        .pricing-tagline { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #6366f1; margin-bottom: 1rem; }

        .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 1.5rem; max-width: 1060px; margin: 0 auto; padding: 0 1.5rem 5rem; }

        .plan-card { background: #0d0d20; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 2rem; display: flex; flex-direction: column; position: relative; transition: border-color 0.2s, transform 0.2s; }
        .plan-card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-2px); }
        .plan-card.highlight { border-color: #10b981; box-shadow: 0 0 0 1px #10b981, 0 8px 32px rgba(16,185,129,0.12); }
        .plan-card.highlight:hover { border-color: #34d399; }

        .badge { display: inline-block; background: #10b981; color: #fff; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.25rem 0.65rem; border-radius: 20px; margin-bottom: 1rem; }
        .tier-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #334155; margin-bottom: 0.25rem; }

        .plan-name { font-size: 1.15rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.5rem; }
        .plan-price { font-size: 2.75rem; font-weight: 800; color: #f8fafc; letter-spacing: -0.04em; line-height: 1; }
        .plan-price span { font-size: 1rem; font-weight: 500; color: #64748b; letter-spacing: 0; }
        .plan-price-note { font-size: 0.78rem; color: #64748b; margin-top: 0.35rem; line-height: 1.4; }
        .plan-contact { font-size: 1.25rem; font-weight: 700; color: #94a3b8; letter-spacing: -0.01em; margin: 0.25rem 0; }
        .plan-desc { margin-top: 0.75rem; font-size: 0.875rem; color: #94a3b8; line-height: 1.55; min-height: 2.8rem; }
        .plan-divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 1.5rem 0; }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 0.625rem; flex: 1; }
        .plan-features li { font-size: 0.85rem; color: #cbd5e1; display: flex; align-items: flex-start; gap: 0.5rem; }
        .plan-features li::before { content: '✓'; color: #10b981; font-weight: 700; flex-shrink: 0; margin-top: 0.05rem; }

        .plan-cta { display: block; text-align: center; margin-top: 2rem; padding: 0.75rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; text-decoration: none; transition: background 0.15s, color 0.15s; cursor: pointer; }
        .plan-cta-default { background: rgba(255,255,255,0.06); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
        .plan-cta-default:hover { background: rgba(255,255,255,0.1); }
        .plan-cta-highlight { background: #10b981; color: #fff; }
        .plan-cta-highlight:hover { background: #059669; }

        .section { max-width: 1060px; margin: 0 auto; padding: 0 1.5rem 5rem; }

        /* Metered add-ons section */
        .addons-header { max-width: 1060px; margin: 0 auto; padding: 0 1.5rem 2rem; }
        .addons-eyebrow { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6366f1; margin-bottom: 0.75rem; }
        .addons-headline { font-size: clamp(1.5rem, 3.5vw, 2.25rem); font-weight: 800; color: #f8fafc; letter-spacing: -0.03em; }
        .addons-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 1.25rem; max-width: 1060px; margin: 0 auto; padding: 0 1.5rem 2rem; }
        .addon-card { background: #0d0d20; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.75rem; display: flex; flex-direction: column; transition: border-color 0.2s, transform 0.2s; }
        .addon-card:hover { border-color: rgba(255,255,255,0.16); transform: translateY(-2px); }
        .addon-card.oem { border-color: rgba(239,68,68,0.35); }
        .addon-tier { display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
        .addon-tier-badge { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); border-radius: 20px; padding: 0.2rem 0.55rem; }
        .addon-tier-badge.oem { background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.3); }
        .addon-name { font-size: 1rem; font-weight: 700; color: #f1f5f9; }
        .addon-price-sub { font-size: 0.78rem; color: #475569; margin-bottom: 0.25rem; }
        .addon-buyers { font-size: 0.75rem; color: #64748b; margin: 0.75rem 0 0.25rem; display: flex; align-items: center; gap: 0.4rem; }
        .addon-trigger { font-size: 0.72rem; font-weight: 600; background: rgba(245,158,11,0.12); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25); border-radius: 4px; padding: 0.2rem 0.5rem; margin: 0.5rem 0 0.75rem; display: inline-block; }
        .addon-trigger.consortium { background: rgba(239,68,68,0.1); color: #f87171; border-color: rgba(239,68,68,0.25); }
        .addon-desc { font-size: 0.85rem; color: #94a3b8; line-height: 1.55; margin-bottom: 1rem; }
        .addon-features { list-style: none; padding: 0; margin: 0 0 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
        .addon-features li { font-size: 0.82rem; color: #cbd5e1; display: flex; align-items: flex-start; gap: 0.45rem; }
        .addon-features li::before { content: '✓'; color: #10b981; font-weight: 700; flex-shrink: 0; }
        .addon-tiers-table { border-top: 1px solid rgba(255,255,255,0.07); padding-top: 1rem; margin-top: auto; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.3rem; }
        .addon-tier-row { display: flex; justify-content: space-between; font-size: 0.78rem; }
        .addon-tier-row .vol { color: #64748b; }
        .addon-tier-row .rate { color: #94a3b8; font-weight: 600; }
        .addon-cta { display: block; text-align: center; padding: 0.65rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem; text-decoration: none; background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); transition: background 0.15s; cursor: pointer; }
        .addon-cta:hover { background: rgba(255,255,255,0.09); }
        .addon-cta.oem { color: #f87171; border-color: rgba(239,68,68,0.3); }
        .addon-cta.oem:hover { background: rgba(239,68,68,0.08); }

        /* Collapsible section header */
        .collapsible-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; padding: 1.25rem 1.5rem; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: #0d0d20; margin-bottom: 0; transition: border-color 0.2s, background 0.2s; }
        .collapsible-header:hover { border-color: rgba(255,255,255,0.16); background: rgba(255,255,255,0.02); }
        .collapsible-header.open { border-radius: 12px 12px 0 0; border-bottom-color: transparent; }
        .collapsible-title { font-size: 1.2rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; }
        .collapsible-chevron { color: #64748b; transition: transform 0.25s; font-size: 1.1rem; }
        .collapsible-chevron.open { transform: rotate(180deg); }
        .collapsible-body { border: 1px solid rgba(255,255,255,0.08); border-top: none; border-radius: 0 0 12px 12px; overflow: hidden; }

        /* Comparison table */
        .comparison-table { width: 100%; border-collapse: collapse; }
        .comparison-table thead th { background: #0d0d20; padding: 1rem 1.25rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; text-align: left; }
        .comparison-table thead th:not(:first-child) { text-align: center; }
        .comparison-table thead th.col-t1 { color: #10b981; }
        .comparison-table tbody tr { border-top: 1px solid rgba(255,255,255,0.05); transition: background 0.12s; }
        .comparison-table tbody tr:hover { background: rgba(255,255,255,0.02); }
        .comparison-table tbody td { padding: 0.875rem 1.25rem; font-size: 0.875rem; color: #cbd5e1; }
        .comparison-table tbody td:not(:first-child) { text-align: center; color: #94a3b8; }
        .comparison-table tbody td.check { color: #10b981; font-weight: 700; }
        .comparison-table tbody td.dash { color: #334155; }

        /* FAQ accordion */
        .faq-list { display: flex; flex-direction: column; gap: 0; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
        .faq-item { border-top: 1px solid rgba(255,255,255,0.06); }
        .faq-item:first-child { border-top: none; }
        .faq-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.75rem; cursor: pointer; background: none; border: none; text-align: left; gap: 1rem; transition: background 0.15s; }
        .faq-toggle:hover { background: rgba(255,255,255,0.02); }
        .faq-q { font-size: 0.975rem; font-weight: 600; color: #f1f5f9; line-height: 1.4; }
        .faq-chevron { color: #64748b; flex-shrink: 0; transition: transform 0.25s; font-size: 1rem; }
        .faq-chevron.open { transform: rotate(180deg); }
        .faq-a { font-size: 0.9rem; color: #94a3b8; line-height: 1.65; padding: 0 1.75rem 1.25rem; }

        @media (max-width: 640px) {
          .pricing-hero { padding: 3rem 1rem 2.5rem; }
          .plans-grid { padding-bottom: 3rem; }
        }
      `}</style>

      {/* Hero */}
      <section className="pricing-hero">
        <p className="pricing-tagline">Core Platform — Runtime</p>
        <h1>Start free. Run in production.<br />Go sovereign.</h1>
        <p>One platform. Three tiers. Every action governed.</p>
      </section>

      {/* Plan cards */}
      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.tier} className={`plan-card${plan.highlight ? ' highlight' : ''}`}>
            {plan.badge && <span className="badge">{plan.badge}</span>}
            <div className="tier-label">{plan.tier}</div>
            <div className="plan-name">{plan.name}</div>

            {plan.showPrice ? (
              <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                <div className="plan-price">
                  {plan.price}
                  {plan.period && <span>{plan.period}</span>}
                </div>
                {plan.scalingNote && (
                  <div className="plan-price-note">{plan.scalingNote}</div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                <div className="plan-contact">
                  {plan.tier === 'T0' ? 'Free' : 'Contact sales →'}
                </div>
              </div>
            )}

            <div className="plan-desc">{plan.description}</div>
            <hr className="plan-divider" />
            <ul className="plan-features">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <a
              href={plan.ctaHref}
              className={`plan-cta ${plan.highlight ? 'plan-cta-highlight' : 'plan-cta-default'}`}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>

      {/* ── Metered Add-Ons — Evidence Plane ── */}
      <div className="addons-header">
        <p className="addons-eyebrow">Metered Add-Ons — Evidence Plane</p>
        <h2 className="addons-headline">Three products. Three buyers. Three budgets.</h2>
      </div>

      <div className="addons-grid" style={{ marginBottom: '3rem' }}>
        {addons.map((addon) => (
          <div key={addon.tier} className={`addon-card${addon.oem ? ' oem' : ''}`}>
            <div className="addon-tier">
              <span className={`addon-tier-badge${addon.oem ? ' oem' : ''}`}>{addon.tier}</span>
              <span className="addon-name">{addon.name}</span>
            </div>

            {/* Platform fee label for T-I only */}
            {addon.oem && (
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#64748b', fontStyle: 'italic', marginBottom: '0.2rem' }}>
                Platform fee
              </div>
            )}

            <div className="addon-price-sub">{addon.priceSub}</div>
            <div className="addon-buyers">{addon.buyers}</div>
            <span className={`addon-trigger${addon.triggerRed ? ' consortium' : ''}`}>{addon.trigger}</span>
            <div className="addon-desc">{addon.desc}</div>
            <ul className="addon-features">
              {addon.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            {/* Volume tier table with real prices */}
            {addon.tiers.length > 0 && (
              <div className="addon-tiers-table">
                {addon.tiers.map(([vol, rate]) => (
                  <div key={vol} className="addon-tier-row">
                    <span className="vol">{vol}</span>
                    <span className="rate">{rate}</span>
                  </div>
                ))}
              </div>
            )}

            {addon.tiers.length === 0 && <div style={{ flex: 1 }} />}

            <a href={addon.ctaHref} className={`addon-cta${addon.oem ? ' oem' : ''}`}>
              {addon.cta}
            </a>
          </div>
        ))}
      </div>

      {/* ── Full feature comparison — collapsible ── */}
      <section className="section">
        <div
          className={`collapsible-header${comparisonOpen ? ' open' : ''}`}
          onClick={() => setComparisonOpen((v) => !v)}
          role="button"
          aria-expanded={comparisonOpen}
        >
          <span className="collapsible-title">Full feature comparison</span>
          <span className={`collapsible-chevron${comparisonOpen ? ' open' : ''}`}>▼</span>
        </div>
        {comparisonOpen && (
          <div className="collapsible-body">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>T0 · Developer</th>
                  <th className="col-t1">T1 · Core</th>
                  <th>TE · Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className={row.t0 === '✓' ? 'check' : row.t0 === '—' ? 'dash' : ''}>{row.t0}</td>
                    <td className={row.t1 === '✓' ? 'check' : row.t1 === '—' ? 'dash' : ''}>{row.t1}</td>
                    <td className={row.te === '✓' ? 'check' : row.te === '—' ? 'dash' : ''}>{row.te}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── FAQ — collapsible accordion ── */}
      <section className="section">
        <div className="faq-list">
          {/* Section header row */}
          <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Frequently asked questions
            </div>
          </div>

          {faqs.map((faq, i) => (
            <div key={faq.q} className="faq-item">
              <button
                className="faq-toggle"
                onClick={() => toggleFaq(i)}
                aria-expanded={openFaqs.has(i)}
              >
                <span className="faq-q">{faq.q}</span>
                <span className={`faq-chevron${openFaqs.has(i) ? ' open' : ''}`}>▼</span>
              </button>
              {openFaqs.has(i) && (
                <div className="faq-a">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

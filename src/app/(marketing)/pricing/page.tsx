'use client';

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
    // price: '€0',  ← hidden per pricing policy (top-of-funnel, no price anchor)
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
    // price: '€250,000+',  ← hidden per pricing policy (contact sales)
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

const comparisonFeatures = [
  { label: 'Agents',                         t0: '1 tenant',      t1: 'Unlimited',   te: 'Unlimited' },
  { label: 'Agent actions / month',          t0: '10K',           t1: 'Up to 2M',    te: 'Custom' },
  { label: 'Audit log retention',            t0: '30 days',       t1: '30 days rolling', te: 'Custom' },
  { label: 'Ed25519-signed provenance',      t0: '—',             t1: '✓',           te: '✓' },
  { label: 'HITL Approval API',              t0: '—',             t1: '✓',           te: '✓' },
  { label: 'Anomaly detection',              t0: '—',             t1: '✓',           te: '✓' },
  { label: 'Agent FinOps guardrails',        t0: '—',             t1: '✓',           te: '✓' },
  { label: 'Shadow AI discovery',            t0: '—',             t1: '✓',           te: '✓' },
  { label: 'Blast radius scoring',           t0: '—',             t1: '✓',           te: '✓' },
  { label: 'SDK access',                     t0: '—',             t1: '✓',           te: '✓' },
  { label: 'Slack / ServiceNow / Jira',      t0: '—',             t1: '✓',           te: '✓' },
  { label: 'PQC signatures (ML-DSA-65)',     t0: '—',             t1: '—',           te: '✓' },
  { label: 'EU-only data residency',         t0: '—',             t1: '—',           te: '✓' },
  { label: 'BYO-HSM signing',               t0: '—',             t1: '—',           te: '✓' },
  { label: 'Dedicated infrastructure',       t0: '—',             t1: '—',           te: '✓' },
  { label: 'SOC 2 Type II readiness',        t0: '—',             t1: '—',           te: '✓' },
  { label: 'GDPR DPA + SLA guarantee',       t0: '—',             t1: '—',           te: '✓' },
  { label: 'Notified body template signing', t0: '—',             t1: '—',           te: '✓' },
  { label: 'Support',                        t0: 'Community',     t1: 'Priority',    te: 'Dedicated CSM' },
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
        .section-title { font-size: 1.5rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; margin-bottom: 2rem; }

        .comparison-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
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

        .faq-list { display: flex; flex-direction: column; gap: 0; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
        .faq-item { padding: 1.5rem 1.75rem; border-top: 1px solid rgba(255,255,255,0.06); }
        .faq-item:first-child { border-top: none; }
        .faq-q { font-size: 1rem; font-weight: 600; color: #f1f5f9; margin-bottom: 0.625rem; }
        .faq-a { font-size: 0.9rem; color: #94a3b8; line-height: 1.65; }

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

            {/* Price — only shown for T1 (Core) */}
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
              /* T0 and TE: price intentionally hidden — contact sales for TE, free for T0 */
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

      {/* Feature comparison */}
      <section className="section">
        <h2 className="section-title">Full feature comparison</h2>
        <div className="comparison-wrap">
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
      </section>

      {/* FAQ */}
      <section className="section">
        <h2 className="section-title">Frequently asked questions</h2>
        <div className="faq-list">
          {faqs.map((faq) => (
            <div key={faq.q} className="faq-item">
              <div className="faq-q">{faq.q}</div>
              <div className="faq-a">{faq.a}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

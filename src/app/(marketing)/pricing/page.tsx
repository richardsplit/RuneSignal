'use client';

const corePlans = [
  {
    tier: 'T0',
    name: 'Developer',
    price: '€0',
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
    accentColor: '#64748b',
  },
  {
    tier: 'T1',
    name: 'Core',
    price: '€1,500',
    period: '/mo',
    description: 'Full runtime for production agent fleets. Starts at €1,500/mo, scales to €6,000/mo by action volume.',
    features: [
      'Everything in Developer',
      'Up to 2M agent actions / month',
      '90-day audit ledger (rolling)',
      'Ed25519-signed provenance on every action',
      'HITL Approval API + Slack/ServiceNow/Jira',
      'Anomaly detection (Welford z-score)',
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
    accentColor: '#10b981',
  },
  {
    tier: 'TE',
    name: 'Enterprise Sovereign',
    price: '€250K+',
    period: ' / year',
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
    accentColor: '#7c3aed',
  },
];

const addOns = [
  {
    tier: 'T2',
    name: 'Evidence Pack Add-On',
    price: '€0.05 – €0.50',
    unit: 'per signed Pack',
    description: 'Metered add-on on top of Core. Volume-tiered. One regulated enterprise at 5M decisions/yr = €50K–€500K ARR.',
    buyer: 'General Counsel · CRO · Head of AI Risk',
    urgency: 'EU AI Act Art. 12 deadline: 2 August 2026',
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
      { qty: '< 100 packs/mo',   price: '€0.50 / pack' },
      { qty: '100–999 packs/mo', price: '€0.20 / pack' },
      { qty: '1K–9K packs/mo',   price: '€0.10 / pack' },
      { qty: '10K+ packs/mo',    price: '€0.05 / pack' },
    ],
    accentColor: '#f59e0b',
  },
  {
    tier: 'T3',
    name: 'Decision Ledger & Reversibility',
    price: '€15K – €150K',
    unit: 'ACV + per-query',
    description: 'Forensic replay API, outcome back-labeling, reversal orchestrator. Priced per-query on top of ACV.',
    buyer: 'Head of AI Ops · CRO · General Counsel',
    urgency: 'Triggered by first material incident',
    features: [
      'Forensic replay: full reasoning chain per decision',
      'Outcome back-labeling (accepted / rejected / reversed / litigated)',
      'Webhook ingest from Jira, ServiceNow, insurance claims',
      'Reversal orchestrator (refund / revoke / rollback / retract)',
      'Decision outcome → SOUL policy feedback loop',
      'Replay API: €0.10 – €1.00 per query (volume-tiered)',
      'Retention: 7-year decision archive',
    ],
    tiers: [
      { qty: '< 100 replays/mo',   price: '€1.00 / query' },
      { qty: '100–999 replays/mo', price: '€0.50 / query' },
      { qty: '1K–9K replays/mo',   price: '€0.20 / query' },
      { qty: '10K+ replays/mo',    price: '€0.10 / query' },
    ],
    accentColor: '#3b82f6',
  },
  {
    tier: 'T4',
    name: 'Agent Passport Registry',
    price: '€25K – €500K',
    unit: 'ACV + per-verification',
    description: 'Cross-org signed agent identity + capability attestation. Network-effect trust layer. Per-verification metering.',
    buyer: 'Platform Eng · CISO · Counterparty trust',
    urgency: 'Consortium moat — 12+ mo cycle, long-term flywheel',
    features: [
      'Signed Agent Passport (RS-XXXX-XXXX format)',
      'W3C VC / SPIFFE-compatible capability attestation',
      'Cross-org counterparty verification API',
      'Reputation scorecard (incident / anomaly weighted)',
      'Public registry browse + DID publishing',
      'Revocation lists + suspension lifecycle',
      'Verification API: €0.02 – €0.20 per check',
      'Passport issuance: €1.00 – €5.00 per agent',
      'IETF WIMSE / OpenID AgentID standards-body presence',
    ],
    tiers: [
      { qty: '< 1K verifications/mo',   price: '€0.20 / verification' },
      { qty: '1K–9K verifications/mo',  price: '€0.10 / verification' },
      { qty: '10K–99K verifications/mo', price: '€0.05 / verification' },
      { qty: '1M+ verifications/mo',    price: '€0.02 / verification' },
    ],
    accentColor: '#8b5cf6',
  },
  {
    tier: 'TI',
    name: 'Insurance Carrier OEM',
    price: 'Platform fee',
    unit: '+ revenue-share per insured agent',
    description: 'Carrier embeds RuneSignal as the independent evidence plane in their AI-liability policy. Push adoption across their book of business.',
    buyer: 'Reinsurer / Insurance Carrier',
    urgency: 'Phase 9 — requires 3+ signed contracts to activate',
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
    accentColor: '#ef4444',
  },
];

const comparisonFeatures = [
  { label: 'Agent actions / month',      t0: '10K',        t1: '2M',         te: 'Unlimited' },
  { label: 'Audit log retention',        t0: '30 days',    t1: '90 days',    te: 'Custom / 10yr' },
  { label: 'Cryptographic signing',      t0: '—',          t1: '✓',          te: '✓ + HSM/PQC' },
  { label: 'HITL Approval API',          t0: '—',          t1: '✓',          te: '✓' },
  { label: 'Anomaly detection',          t0: '—',          t1: '✓',          te: '✓' },
  { label: 'NHI lifecycle',              t0: '—',          t1: '✓',          te: '✓' },
  { label: 'A2A cross-org gateway',      t0: '—',          t1: '✓',          te: '✓' },
  { label: 'Evidence Packs (add-on)',     t0: '—',          t1: 'Metered T2', te: 'Metered T2' },
  { label: 'Decision Ledger (add-on)',    t0: '—',          t1: 'Metered T3', te: 'Metered T3' },
  { label: 'Agent Passport Registry',    t0: '—',          t1: 'Metered T4', te: 'Metered T4' },
  { label: 'EU-only data residency',     t0: '—',          t1: '—',          te: '✓' },
  { label: 'Dedicated infrastructure',   t0: '—',          t1: '—',          te: '✓' },
  { label: 'PQC signatures (ML-DSA-65)', t0: '—',          t1: '—',          te: '✓' },
  { label: 'Notified body co-signing',   t0: '—',          t1: '—',          te: '✓' },
  { label: 'SOC 2 Type II',             t0: '—',          t1: '—',          te: '✓' },
  { label: 'GDPR DPA + SLA',            t0: '—',          t1: '—',          te: '✓' },
  { label: 'Dedicated CSM',             t0: '—',          t1: '—',          te: '✓' },
  { label: 'Support',                   t0: 'Community',  t1: 'Priority',   te: 'Dedicated' },
];

const faqs = [
  {
    q: 'How does Evidence Pack metered billing work?',
    a: 'Every time you generate a signed Evidence Pack, a usage event is recorded. You are billed at the end of the month based on volume tier. A regulated enterprise running 5M decisions/year at €0.10/pack = €500K ARR on top of Core — this is the Snowflake/Datadog pricing shape.',
  },
  {
    q: 'Is the EU AI Act deadline forcing this purchase?',
    a: 'Yes. EU AI Act Art. 12 mandates signed, append-only decision logs with 10-year retention for high-risk AI systems. The compliance deadline is 2 August 2026. Evidence Packs are the RuneSignal implementation of that requirement.',
  },
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Core plans are billed monthly with no long-term commitment. Metered add-ons (T2/T3/T4) scale automatically with usage — you only pay for what you consume. Enterprise Sovereign is annual.',
  },
  {
    q: "What counts as an 'agent action'?",
    a: 'Any event routed through the RuneSignal governance runtime — LLM calls, tool invocations, HITL approvals, anomaly checks, A2A handshakes. Each event is signed, logged, and counted against your monthly quota.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes. Annual plans come with a 20% discount compared to monthly. Core annual starts at €15,000/yr (vs €18,000/yr monthly). Contact us to activate.',
  },
  {
    q: 'What is the Agent Passport Registry network-effect moat?',
    a: 'The Registry is to agents what VeriSign was to SSL certificates — a neutral, consortium-backed trust anchor that every counterparty queries. Once an agent has a RuneSignal Passport, any company they interact with can verify it via API. This creates a cross-org flywheel that is not replicable by runtime-only competitors.',
  },
];

export default function PricingPage() {
  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        .pricing-hero { text-align: center; padding: 5rem 1.5rem 3rem; }
        .pricing-hero h1 { font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 800; letter-spacing: -0.04em; color: #f8fafc; line-height: 1.1; }
        .pricing-hero .sub { margin-top: 1rem; font-size: 1.125rem; color: #94a3b8; max-width: 560px; margin-left: auto; margin-right: auto; }
        .pricing-hero .label { display: inline-block; background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(52,211,153,0.3); border-radius: 20px; padding: 0.3rem 0.9rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1.5rem; }

        .section-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }
        .section-heading { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; margin-bottom: 0.625rem; }
        .section-title { font-size: 1.5rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; margin-bottom: 2rem; }

        /* Core plans grid */
        .core-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 1.5rem; margin-bottom: 5rem; }
        .plan-card { background: #0d0d20; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 2rem; display: flex; flex-direction: column; position: relative; transition: border-color 0.2s, transform 0.2s; }
        .plan-card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-2px); }
        .plan-card.hl { border-color: #10b981; box-shadow: 0 0 0 1px #10b981, 0 8px 32px rgba(16,185,129,0.12); }
        .tier-badge { display: inline-block; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.2rem 0.55rem; border-radius: 20px; margin-bottom: 0.625rem; }
        .plan-name { font-size: 1.1rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.5rem; }
        .plan-price { font-size: 2.5rem; font-weight: 800; color: #f8fafc; letter-spacing: -0.04em; line-height: 1; }
        .plan-price small { font-size: 1rem; font-weight: 500; color: #64748b; letter-spacing: 0; }
        .plan-desc { margin-top: 0.75rem; font-size: 0.85rem; color: #94a3b8; line-height: 1.55; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 1.25rem; margin-bottom: 1.25rem; }
        .plan-features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.55rem; flex: 1; }
        .plan-features li { font-size: 0.85rem; color: #cbd5e1; display: flex; align-items: flex-start; gap: 0.5rem; }
        .plan-features li::before { content: '✓'; font-weight: 700; flex-shrink: 0; margin-top: 0.05rem; }
        .plan-cta { display: block; text-align: center; margin-top: 2rem; padding: 0.75rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem; text-decoration: none; transition: background 0.15s; }
        .plan-cta-def { background: rgba(255,255,255,0.06); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
        .plan-cta-def:hover { background: rgba(255,255,255,0.1); }
        .plan-cta-hl { background: #10b981; color: #fff; }
        .plan-cta-hl:hover { background: #059669; }
        .plan-cta-ent { background: rgba(124,58,237,0.15); color: #a78bfa; border: 1px solid rgba(124,58,237,0.35); }
        .plan-cta-ent:hover { background: rgba(124,58,237,0.25); }

        /* Add-on cards */
        .addon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 5rem; }
        .addon-card { background: #0d0d20; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1.75rem; display: flex; flex-direction: column; }
        .addon-card:hover { border-color: rgba(255,255,255,0.15); }
        .addon-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
        .addon-price { font-size: 1.5rem; font-weight: 800; color: #f8fafc; letter-spacing: -0.03em; }
        .addon-unit { font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; }
        .addon-desc { font-size: 0.8rem; color: #94a3b8; line-height: 1.5; margin-bottom: 0.875rem; }
        .addon-buyer { font-size: 0.7rem; color: #64748b; margin-bottom: 0.375rem; }
        .addon-urgency { font-size: 0.7rem; font-weight: 600; color: #f59e0b; background: rgba(245,158,11,0.1); border-radius: 4px; padding: 0.2rem 0.5rem; display: inline-block; margin-bottom: 1rem; }
        .addon-features { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
        .addon-features li { font-size: 0.8rem; color: #cbd5e1; display: flex; gap: 0.4rem; align-items: flex-start; }
        .addon-features li::before { content: '✓'; font-weight: 700; flex-shrink: 0; }
        .tier-table { width: 100%; border-collapse: collapse; margin-top: auto; }
        .tier-table td { font-size: 0.72rem; padding: 0.3rem 0; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.05); }
        .tier-table td:last-child { text-align: right; color: #f8fafc; font-weight: 600; font-variant-numeric: tabular-nums; }
        .addon-cta { display: block; text-align: center; margin-top: 1.25rem; padding: 0.6rem 1rem; border-radius: 7px; font-weight: 600; font-size: 0.8rem; text-decoration: none; background: rgba(255,255,255,0.06); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); transition: background 0.15s; }
        .addon-cta:hover { background: rgba(255,255,255,0.1); }

        /* Comparison table */
        .comparison-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 5rem; }
        .ctable { width: 100%; border-collapse: collapse; }
        .ctable thead th { background: #0d0d20; padding: 1rem 1.25rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; text-align: left; }
        .ctable thead th:not(:first-child) { text-align: center; }
        .ctable thead th.hl { color: #10b981; }
        .ctable tbody tr { border-top: 1px solid rgba(255,255,255,0.05); transition: background 0.12s; }
        .ctable tbody tr:hover { background: rgba(255,255,255,0.02); }
        .ctable tbody td { padding: 0.75rem 1.25rem; font-size: 0.85rem; color: #cbd5e1; }
        .ctable tbody td:not(:first-child) { text-align: center; color: #94a3b8; }
        .ctable .ck { color: #10b981; font-weight: 700; }
        .ctable .ds { color: #334155; }
        .ctable .mt { color: #f59e0b; font-size: 0.78rem; }

        /* FAQ */
        .faq-list { display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; margin-bottom: 5rem; }
        .faq-item { padding: 1.5rem 1.75rem; border-top: 1px solid rgba(255,255,255,0.06); }
        .faq-item:first-child { border-top: none; }
        .faq-q { font-size: 0.975rem; font-weight: 600; color: #f1f5f9; margin-bottom: 0.5rem; }
        .faq-a { font-size: 0.875rem; color: #94a3b8; line-height: 1.65; }

        @media (max-width: 640px) {
          .pricing-hero { padding: 3rem 1rem 2rem; }
        }
      `}</style>

      {/* Hero */}
      <section className="pricing-hero">
        <div className="label">Agent Evidence Plane — Pricing</div>
        <h1>Three revenue lines.<br />One unified runtime.</h1>
        <p className="sub">Core platform + metered Evidence Packs, Decision Ledger, and Agent Registry. Three buyers, three budgets, one cryptographic guarantee.</p>
      </section>

      {/* Core plans */}
      <div className="section-wrap" style={{ marginBottom: '1rem' }}>
        <div className="section-heading">Core platform — Runtime</div>
        <div className="section-title" style={{ marginBottom: '1.5rem' }}>Start free. Run in production. Go sovereign.</div>
        <div className="core-grid">
          {corePlans.map((plan) => (
            <div key={plan.tier} className={`plan-card${plan.highlight ? ' hl' : ''}`}>
              <span className="tier-badge" style={{ background: plan.accentColor + '22', color: plan.accentColor, border: `1px solid ${plan.accentColor}44` }}>{plan.tier}</span>
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">
                {plan.price}
                {plan.period && <small>{plan.period}</small>}
              </div>
              <div className="plan-desc">{plan.description}</div>
              <ul className="plan-features" style={{ '--check-color': plan.accentColor } as React.CSSProperties}>
                {plan.features.map((f) => (
                  <li key={f} style={{ '--check-color': plan.accentColor } as React.CSSProperties}>
                    <span style={{ color: plan.accentColor }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={plan.ctaHref}
                className={`plan-cta ${plan.highlight ? 'plan-cta-hl' : plan.tier === 'TE' ? 'plan-cta-ent' : 'plan-cta-def'}`}
                style={plan.highlight ? { background: plan.accentColor } : {}}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Add-on products */}
      <div className="section-wrap" style={{ marginBottom: '1rem' }}>
        <div className="section-heading">Metered add-ons — Evidence Plane</div>
        <div className="section-title" style={{ marginBottom: '1.5rem' }}>Three products. Three buyers. Three budgets.</div>
        <div className="addon-grid">
          {addOns.map((addon) => (
            <div key={addon.tier} className="addon-card" style={{ borderColor: addon.accentColor + '33' }}>
              <div className="addon-header">
                <span className="tier-badge" style={{ background: addon.accentColor + '1a', color: addon.accentColor, border: `1px solid ${addon.accentColor}33`, fontSize: '0.62rem', fontWeight: 800 }}>{addon.tier}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', lineHeight: 1.2 }}>{addon.name}</div>
                </div>
              </div>
              <div className="addon-price" style={{ color: addon.accentColor }}>{addon.price}</div>
              <div className="addon-unit">{addon.unit}</div>
              <div className="addon-desc" style={{ marginTop: '0.625rem' }}>{addon.description}</div>
              <div className="addon-buyer">👤 {addon.buyer}</div>
              <div className="addon-urgency">{addon.urgency}</div>
              <ul className="addon-features">
                {addon.features.map((f) => (
                  <li key={f}>
                    <span style={{ color: addon.accentColor }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {addon.tiers.length > 0 && (
                <table className="tier-table">
                  <tbody>
                    {addon.tiers.map((t) => (
                      <tr key={t.qty}>
                        <td>{t.qty}</td>
                        <td>{t.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <a href="mailto:sales@runesignal.io" className="addon-cta" style={{ marginTop: '1.25rem', borderColor: addon.accentColor + '44', color: addon.accentColor }}>
                {addon.tier === 'TI' ? 'Partner with us' : 'Talk to sales'}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison table */}
      <div className="section-wrap">
        <h2 className="section-title">Full feature comparison</h2>
        <div className="comparison-wrap">
          <table className="ctable">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Developer (T0)</th>
                <th className="hl">Core (T1)</th>
                <th>Enterprise Sovereign (TE)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className={row.t0 === '✓' ? 'ck' : row.t0 === '—' ? 'ds' : row.t0.startsWith('Metered') ? 'mt' : ''}>{row.t0}</td>
                  <td className={row.t1 === '✓' ? 'ck' : row.t1 === '—' ? 'ds' : row.t1.startsWith('Metered') ? 'mt' : ''}>{row.t1}</td>
                  <td className={row.te === '✓' ? 'ck' : row.te === '—' ? 'ds' : row.te.startsWith('Metered') ? 'mt' : ''}>{row.te}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="section-wrap">
        <h2 className="section-title">Frequently asked questions</h2>
        <div className="faq-list">
          {faqs.map((faq) => (
            <div key={faq.q} className="faq-item">
              <div className="faq-q">{faq.q}</div>
              <div className="faq-a">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

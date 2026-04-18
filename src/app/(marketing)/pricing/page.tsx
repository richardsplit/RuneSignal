'use client';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For teams exploring AI governance',
    features: [
      '3 agents',
      '7-day audit logs',
      'Basic SLA monitoring',
      'Community support',
      'EU AI Act evidence report (5/mo)',
    ],
    cta: 'Get started free',
    ctaHref: '/login?mode=signup',
    highlight: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$299',
    period: '/mo',
    description: 'For teams running AI in production',
    features: [
      'Everything in Starter',
      'Unlimited agents',
      '90-day audit logs',
      'HITL Approval API',
      'Blast radius scoring',
      'Shadow AI discovery',
      'Slack / ServiceNow / Jira adapters',
      'SDK access',
      'Priority support',
    ],
    cta: 'Start Pro trial',
    ctaHref: '/login?mode=signup',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For regulated enterprises',
    features: [
      'Everything in Pro',
      'Custom data residency',
      'Dedicated infrastructure',
      'SOC 2 Type II',
      'GDPR DPA',
      'SLA guarantee',
      'Custom integrations',
      'Dedicated CSM',
    ],
    cta: 'Contact sales',
    ctaHref: 'mailto:sales@runesignal.io',
    highlight: false,
    badge: null,
  },
];

const comparisonFeatures = [
  { label: 'Agents', starter: '3', pro: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Audit log retention', starter: '7 days', pro: '90 days', enterprise: 'Custom' },
  { label: 'SLA monitoring', starter: '✓', pro: '✓', enterprise: '✓' },
  { label: 'EU AI Act report', starter: '5/mo', pro: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'HITL Approval API', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'Blast radius scoring', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'Shadow AI discovery', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'Slack / ServiceNow / Jira', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'SDK access', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'Custom data residency', starter: '—', pro: '—', enterprise: '✓' },
  { label: 'Dedicated infrastructure', starter: '—', pro: '—', enterprise: '✓' },
  { label: 'SOC 2 Type II', starter: '—', pro: '—', enterprise: '✓' },
  { label: 'GDPR DPA', starter: '—', pro: '—', enterprise: '✓' },
  { label: 'SLA guarantee', starter: '—', pro: '—', enterprise: '✓' },
  { label: 'Custom integrations', starter: '—', pro: '—', enterprise: '✓' },
  { label: 'Dedicated CSM', starter: '—', pro: '—', enterprise: '✓' },
  { label: 'Support', starter: 'Community', pro: 'Priority', enterprise: 'Dedicated' },
];

const faqs = [
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Yes. Plans are billed monthly with no long-term commitment. You can upgrade or downgrade from your account settings and changes take effect at the start of the next billing cycle.',
  },
  {
    q: 'Is there a free trial for Pro?',
    a: 'Yes. Pro comes with a 14-day free trial — no credit card required. You get full access to every Pro feature from day one.',
  },
  {
    q: "What counts as an 'agent'?",
    a: 'Any AI worker (LLM-based or autonomous) that is registered in the RuneSignal NHI (Non-Human Identity) registry. Each unique agent ID registered against your tenant consumes one agent slot.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes. Annual plans come with a 20% discount compared to monthly billing. Contact us or switch to annual in your billing settings.',
  },
];

export default function PricingPage() {
  return (
    <>
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080812; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }

        .nav { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.07); position: sticky; top: 0; background: rgba(8,8,18,0.92); backdrop-filter: blur(12px); z-index: 50; }
        .nav-logo { display: flex; align-items: center; gap: 0.625rem; text-decoration: none; color: #e2e8f0; font-weight: 700; font-size: 1.1rem; letter-spacing: -0.02em; }
        .nav-logo svg { flex-shrink: 0; }
        .nav-links { display: flex; align-items: center; gap: 1.5rem; }
        .nav-link { color: #94a3b8; text-decoration: none; font-size: 0.9rem; transition: color 0.15s; }
        .nav-link:hover { color: #e2e8f0; }
        .nav-link-cta { background: #10b981; color: #fff !important; padding: 0.45rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.875rem; transition: background 0.15s !important; }
        .nav-link-cta:hover { background: #059669 !important; color: #fff; }

        .hero { text-align: center; padding: 5rem 1.5rem 3.5rem; }
        .hero h1 { font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 800; letter-spacing: -0.04em; color: #f8fafc; line-height: 1.1; }
        .hero p { margin-top: 1rem; font-size: 1.125rem; color: #94a3b8; max-width: 480px; margin-left: auto; margin-right: auto; }

        .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1060px; margin: 0 auto; padding: 0 1.5rem 5rem; }

        .plan-card { background: #0d0d20; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 2rem; display: flex; flex-direction: column; position: relative; transition: border-color 0.2s, transform 0.2s; }
        .plan-card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-2px); }
        .plan-card.highlight { border-color: #10b981; box-shadow: 0 0 0 1px #10b981, 0 8px 32px rgba(16,185,129,0.12); }
        .plan-card.highlight:hover { border-color: #34d399; }

        .badge { display: inline-block; background: #10b981; color: #fff; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.25rem 0.65rem; border-radius: 20px; margin-bottom: 1rem; }

        .plan-name { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; margin-bottom: 0.5rem; }
        .plan-price { font-size: 2.75rem; font-weight: 800; color: #f8fafc; letter-spacing: -0.04em; line-height: 1; }
        .plan-price span { font-size: 1rem; font-weight: 500; color: #64748b; letter-spacing: 0; }
        .plan-desc { margin-top: 0.75rem; font-size: 0.9rem; color: #94a3b8; line-height: 1.5; min-height: 2.8rem; }
        .plan-divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 1.5rem 0; }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 0.625rem; flex: 1; }
        .plan-features li { font-size: 0.875rem; color: #cbd5e1; display: flex; align-items: flex-start; gap: 0.5rem; }
        .plan-features li::before { content: '✓'; color: #10b981; font-weight: 700; flex-shrink: 0; margin-top: 0.05rem; }

        .plan-cta { display: block; text-align: center; margin-top: 2rem; padding: 0.75rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; text-decoration: none; transition: background 0.15s, color 0.15s; }
        .plan-cta-default { background: rgba(255,255,255,0.06); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
        .plan-cta-default:hover { background: rgba(255,255,255,0.1); }
        .plan-cta-highlight { background: #10b981; color: #fff; }
        .plan-cta-highlight:hover { background: #059669; }

        .section { max-width: 1060px; margin: 0 auto; padding: 0 1.5rem 5rem; }
        .section-title { font-size: 1.5rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; margin-bottom: 2rem; }

        /* Comparison table */
        .comparison-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
        .comparison-table { width: 100%; border-collapse: collapse; }
        .comparison-table thead th { background: #0d0d20; padding: 1rem 1.25rem; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; text-align: left; }
        .comparison-table thead th:not(:first-child) { text-align: center; }
        .comparison-table thead th.col-pro { color: #10b981; }
        .comparison-table tbody tr { border-top: 1px solid rgba(255,255,255,0.05); transition: background 0.12s; }
        .comparison-table tbody tr:hover { background: rgba(255,255,255,0.02); }
        .comparison-table tbody td { padding: 0.875rem 1.25rem; font-size: 0.875rem; color: #cbd5e1; }
        .comparison-table tbody td:not(:first-child) { text-align: center; color: #94a3b8; }
        .comparison-table tbody td.check { color: #10b981; font-weight: 700; }
        .comparison-table tbody td.dash { color: #334155; }

        /* FAQ */
        .faq-list { display: flex; flex-direction: column; gap: 0; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
        .faq-item { padding: 1.5rem 1.75rem; border-top: 1px solid rgba(255,255,255,0.06); }
        .faq-item:first-child { border-top: none; }
        .faq-q { font-size: 1rem; font-weight: 600; color: #f1f5f9; margin-bottom: 0.625rem; }
        .faq-a { font-size: 0.9rem; color: #94a3b8; line-height: 1.65; }

        /* Footer */
        .footer { border-top: 1px solid rgba(255,255,255,0.07); padding: 2rem 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: gap; gap: 1rem; max-width: 100%; }
        .footer-copy { font-size: 0.8rem; color: #475569; }
        .footer-links { display: flex; gap: 1.5rem; }
        .footer-link { font-size: 0.8rem; color: #475569; text-decoration: none; transition: color 0.15s; }
        .footer-link:hover { color: #94a3b8; }

        @media (max-width: 640px) {
          .nav-links { gap: 0.875rem; }
          .hero { padding: 3rem 1rem 2.5rem; }
          .plans-grid { padding-bottom: 3rem; }
          .footer { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="RuneSignal logo">
            <rect width="28" height="28" rx="7" fill="#10b981" />
            <path d="M8 8h5.5a4.5 4.5 0 0 1 0 9H8V8Z" fill="#fff" fillOpacity="0.95" />
            <path d="M13.5 17 19 20" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="20.5" cy="20.5" r="2" fill="#3b82f6" />
          </svg>
          RuneSignal
        </a>
        <div className="nav-links">
          <a href="/" className="nav-link">Home</a>
          <a href="/login" className="nav-link nav-link-cta">Sign in</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <h1>Simple, transparent pricing.</h1>
        <p>Start free. Scale when you&apos;re ready. No surprises.</p>
      </section>

      {/* Plan cards */}
      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.name} className={`plan-card${plan.highlight ? ' highlight' : ''}`}>
            {plan.badge && <span className="badge">{plan.badge}</span>}
            <div className="plan-name">{plan.name}</div>
            <div className="plan-price">
              {plan.price}
              {plan.period && <span>{plan.period}</span>}
            </div>
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
                <th>Starter</th>
                <th className="col-pro">Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className={row.starter === '✓' ? 'check' : row.starter === '—' ? 'dash' : ''}>{row.starter}</td>
                  <td className={row.pro === '✓' ? 'check' : row.pro === '—' ? 'dash' : ''}>{row.pro}</td>
                  <td className={row.enterprise === '✓' ? 'check' : row.enterprise === '—' ? 'dash' : ''}>{row.enterprise}</td>
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

      {/* Footer */}
      <footer className="footer">
        <span className="footer-copy">© {new Date().getFullYear()} RuneSignal. All rights reserved.</span>
        <div className="footer-links">
          <a href="/" className="footer-link">Home</a>
          <a href="/documentation" className="footer-link">Documentation</a>
          <a href="/login" className="footer-link">Sign in</a>
        </div>
      </footer>
    </>
  );
}

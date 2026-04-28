import Link from 'next/link';

/**
 * RuneSignal landing page — premium, standalone, token-driven.
 *
 * Server Component. Dark ↔ light switching works via CSS custom properties
 * defined in globals.css. No client state required here; the header handles
 * scroll effects and mobile menu.
 */

export const metadata = {
  title: 'RuneSignal | Enterprise AI Governance',
  description:
    'Governance, accountability, and operational control for AI agent fleets in production. Ship EU AI Act evidence, HITL approvals, and agent inventory from day one.',
};

/* ─── Icons ──────────────────────────────────────────────────────── */

function Icon({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const IconReport = () => (
  <Icon>
    <rect x="3" y="2.5" width="14" height="15" rx="1.75" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.5 7h7M6.5 10h7M6.5 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </Icon>
);
const IconHITL = () => (
  <Icon>
    <circle cx="10" cy="7" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </Icon>
);
const IconInventory = () => (
  <Icon>
    <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
    <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="11" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
  </Icon>
);
const IconIntegrations = () => (
  <Icon>
    <circle cx="4" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="16" cy="4" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 9l8-4M6 11l8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </Icon>
);
const IconSDK = () => (
  <Icon>
    <path d="M6 7l-3 3 3 3M14 7l3 3-3 3M12 5l-4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);
const IconShield = () => (
  <Icon size={16}>
    <path d="M8 2L2 4.5v4.5c0 3 2.5 5.5 6 6.5 3.5-1 6-3.5 6-6.5V4.5L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </Icon>
);
const IconCheck = () => (
  <Icon size={14}>
    <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);
const IconMinus = () => (
  <Icon size={14}>
    <path d="M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </Icon>
);

/* ─── Data ───────────────────────────────────────────────────────── */

const STATS = [
  { v: '142+',   l: 'Agents governed', sub: 'Per tenant, median' },
  { v: '17',     l: 'Shadow agents found', sub: 'Per deployment rollout' },
  { v: '< 40ms', l: 'Firewall latency', sub: 'p95 decision time' },
  { v: '5+',     l: 'Frameworks mapped', sub: 'Out of the box' },
];

const FEATURES = [
  {
    Icon: IconReport,
    title: 'EU AI Act evidence, generated',
    desc: 'Article 13 reports auto-mapped from every agent decision. One-click PDF export. Always audit-ready.',
    code: `POST /v1/compliance/reports/eu-ai-act\n{ "from": "2026-01-01", "to": "2026-07-31",\n  "format": "pdf" }`,
  },
  {
    Icon: IconHITL,
    title: 'Human-in-the-loop approvals',
    desc: 'REST API with automated blast-radius scoring on every pending action. OpenAPI spec included.',
    code: `POST /v1/exceptions/{id}/resolve\n{ "decision": "approved",\n  "blast_radius_score": 7.4 }`,
  },
  {
    Icon: IconInventory,
    title: 'Inventory + shadow AI discovery',
    desc: 'Every declared agent, plus the undeclared ones. Risk scoring, ownership, compliance — all in one place.',
    code: `GET /v1/agent-inventory?include_shadow=true\n# 142 agents · 17 shadow · 3 high-risk`,
  },
  {
    Icon: IconIntegrations,
    title: 'Slack, ServiceNow, Jira',
    desc: 'Unified adapters route HITL approvals, incidents, and tickets from a single API call.',
    code: `POST /v1/integrations/slack/notify\n{ "channel": "#ai-ops",\n  "exception_id": "exc_9f2a4b" }`,
  },
  {
    Icon: IconSDK,
    title: 'SDK + LangChain plugin',
    desc: 'Instrument any agent in three lines. Full TypeScript types, zero-config tracing, automatic policy enforcement.',
    code: `import { RuneSignalClient } from '@runesignal/sdk';\nrs.instrument(myAgent);`,
  },
];

const STEPS = [
  { n: '01', title: 'Register agents',             desc: 'Declare every AI agent — or let Shadow Discovery find the ones you missed.' },
  { n: '02', title: 'Define policies',              desc: 'Blast-radius thresholds, frameworks, HITL rules, and data residency requirements.' },
  { n: '03', title: 'Route through the firewall',  desc: 'Every agent action passes real-time allow / block / escalate decisions.' },
  { n: '04', title: 'Ship evidence',               desc: 'One-click compliance reports and signed audit exports — always current.' },
];

const FRAMEWORKS = [
  { name: 'EU AI Act',     sub: 'Article 13 · August 2026' },
  { name: 'SOC 2 Type II', sub: 'In progress' },
  { name: 'GDPR',          sub: 'EU data residency' },
  { name: 'ISO 27001',     sub: 'Controls mapped' },
  { name: 'NIST AI RMF',   sub: 'Full framework' },
  { name: 'OWASP LLM',     sub: 'Top 10 mapped' },
];

const INTEGRATIONS = [
  'LangChain', 'OpenAI', 'Anthropic', 'AutoGen', 'CrewAI',
  'Slack', 'ServiceNow', 'Jira', 'GitHub', 'PagerDuty',
];

const COMPARE = [
  { feature: 'EU AI Act Article 13 evidence',     rs: true,  credo: 'partial', lakera: false },
  { feature: 'HITL API with blast-radius scoring', rs: true,  credo: false,     lakera: false },
  { feature: 'Shadow AI discovery',               rs: true,  credo: false,     lakera: false },
  { feature: 'Slack / ServiceNow / Jira adapters', rs: true,  credo: 'partial', lakera: false },
  { feature: 'Developer SDK + LangChain plugin',  rs: true,  credo: false,     lakera: 'partial' },
  { feature: 'Real-time action firewall',         rs: true,  credo: false,     lakera: true },
  { feature: 'Cryptographic audit trail',         rs: true,  credo: false,     lakera: false },
  { feature: 'Multi-framework compliance (5+)',   rs: true,  credo: true,      lakera: false },
];

function CompareCell({ value }: { value: boolean | string }) {
  if (value === true)      return <span className="compare-cell yes"><IconCheck />Yes</span>;
  if (value === false)     return <span className="compare-cell no"><IconMinus />No</span>;
  return                          <span className="compare-cell partial">Partial</span>;
}

/* ─── Page ───────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="landing">

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-eyebrow">
            <span className="dot" aria-hidden />
            EU AI Act · August 2026 enforcement
          </span>

          <h1 className="hero-title">
            Govern every AI agent<br />
            <span className="accent">you ship.</span>
          </h1>

          <p className="hero-subtitle">
            RuneSignal is the governance, accountability, and operational
            control plane for AI agent fleets in production — compliance
            evidence, human approvals, and full inventory from day one.
          </p>

          <div className="hero-cta">
            <Link href="/login?mode=signup" className="btn btn-primary btn-lg btn-pill">
              Get started free
            </Link>
            <Link href="/#product" className="btn btn-outline btn-lg btn-pill">
              See the product
            </Link>
          </div>

          <div className="hero-trust">
            <span><IconShield /> SOC 2 Type II in progress</span>
            <span className="sep" aria-hidden />
            <span>EU-hosted deployment</span>
            <span className="sep" aria-hidden />
            <span>Ed25519-signed audit trail</span>
            <span className="sep" aria-hidden />
            <span>No credit card required</span>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────── */}
      <section className="stats-strip" aria-label="At a glance">
        {STATS.map((s) => (
          <div className="stat-tile" key={s.l}>
            <div className="stat-value">{s.v}</div>
            <div className="stat-label">{s.l}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* ── PRODUCT / FEATURES ──────────────────────────────────── */}
      <section className="section" id="product">
        <header className="section-header">
          <span className="t-eyebrow">Platform</span>
          <h2 className="t-h1">Five primitives. One governance plane.</h2>
          <p className="t-body-lg" style={{ color: 'var(--text-secondary)', maxWidth: '54ch' }}>
            Every capability is an API, not a slide deck. Ship governance the
            same way you ship code — with full observability and zero ceremony.
          </p>
        </header>

        <div className="feature-grid">
          {FEATURES.map(({ Icon, title, desc, code }) => (
            <article className="feature-card" key={title}>
              <div className="feature-icon-wrap">
                <Icon />
              </div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
              <pre className="feature-code">{code}</pre>
            </article>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section className="section section-alt" id="how-it-works">
        <header className="section-header">
          <span className="t-eyebrow">How it works</span>
          <h2 className="t-h1">Four steps to audit-ready.</h2>
          <p className="t-body-lg" style={{ color: 'var(--text-secondary)', maxWidth: '46ch' }}>
            From first agent to signed compliance report — in an afternoon.
          </p>
        </header>

        <ol className="steps-grid">
          {STEPS.map((s) => (
            <li className="step-card" key={s.n}>
              <div className="step-n">Step {s.n}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── COMPLIANCE FRAMEWORKS ───────────────────────────────── */}
      <section className="section">
        <header className="section-header">
          <span className="t-eyebrow">Compliance</span>
          <h2 className="t-h1">Built for the frameworks that matter.</h2>
          <p className="t-body-lg" style={{ color: 'var(--text-secondary)', maxWidth: '50ch' }}>
            RuneSignal maps agent behavior to six compliance frameworks out of
            the box. No custom configuration required.
          </p>
        </header>

        <div className="framework-grid">
          {FRAMEWORKS.map((f) => (
            <div className="framework-card" key={f.name}>
              <div className="framework-check" aria-hidden><IconCheck /></div>
              <div>
                <div className="framework-name">{f.name}</div>
                <div className="framework-sub">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTEGRATIONS ────────────────────────────────────────── */}
      <section className="section section-alt">
        <header className="section-header">
          <span className="t-eyebrow">Integrations</span>
          <h2 className="t-h1">Works with the stack you already run.</h2>
          <p className="t-body-lg" style={{ color: 'var(--text-secondary)', maxWidth: '46ch' }}>
            Native adapters for every major AI framework and enterprise ticketing system.
          </p>
        </header>
        <div className="integration-grid">
          {INTEGRATIONS.map((name) => (
            <div className="integration-pill" key={name}>{name}</div>
          ))}
        </div>
      </section>

      {/* ── COMPARE ─────────────────────────────────────────────── */}
      <section className="section">
        <header className="section-header">
          <span className="t-eyebrow">Comparison</span>
          <h2 className="t-h1">Depth where it counts.</h2>
          <p className="t-body-lg" style={{ color: 'var(--text-secondary)', maxWidth: '46ch' }}>
            Most AI governance tools guard the prompt. RuneSignal governs the agent.
          </p>
        </header>

        <div className="compare-wrap">
          <div className="compare-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col" className="us">RuneSignal</th>
                  <th scope="col">Credo AI</th>
                  <th scope="col">Lakera</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.feature}>
                    <td className="label">{row.feature}</td>
                    <td><CompareCell value={row.rs} /></td>
                    <td><CompareCell value={row.credo} /></td>
                    <td><CompareCell value={row.lakera} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="final-cta">
        <span className="t-eyebrow" style={{ marginBottom: 'var(--space-4)' }}>Get started</span>
        <h2 className="t-display" style={{ maxWidth: '20ch' }}>
          Ship governance<br />in an afternoon.
        </h2>
        <p className="t-body-lg" style={{ color: 'var(--text-secondary)', maxWidth: '46ch' }}>
          Free to start. EU-hosted. Signed audit trail from day one.
          No credit card required.
        </p>
        <div className="hero-cta">
          <Link href="/login?mode=signup" className="btn btn-primary btn-lg btn-pill">
            Create your tenant
          </Link>
          <Link href="/pricing" className="btn btn-outline btn-lg btn-pill">
            See pricing
          </Link>
        </div>
      </section>

    </div>
  );
}

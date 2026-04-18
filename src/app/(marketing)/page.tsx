import Link from 'next/link';

/**
 * RuneSignal landing page.
 *
 * Standalone, token-driven, dual-theme. All visual rules live in globals.css
 * (`.landing`, `.hero`, `.feature-grid`, etc.) so dark ↔ light switching
 * "just works" via CSS custom properties.
 *
 * Kept as a Server Component — no client state needed; the header handles
 * scroll effects and mobile menu.
 */

export const metadata = {
  title: 'RuneSignal | Enterprise AI Governance',
  description:
    'Governance, accountability, and operational control for AI agent fleets in production. Ship EU AI Act evidence, HITL approvals, and agent inventory from day one.',
};

/* ─── Icons ─────────────────────────────────────────────── */

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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

/* ─── Data ─────────────────────────────────────────────── */

const FEATURES = [
  {
    Icon: IconReport,
    title: 'EU AI Act evidence, generated',
    desc:
      'Article 13 reports, auto-mapped from every agent decision. One-click PDF export. Always audit-ready.',
    code: `POST /v1/compliance/reports/eu-ai-act
{ "from": "2026-01-01", "to": "2026-07-31",
  "format": "pdf" }`,
  },
  {
    Icon: IconHITL,
    title: 'Human-in-the-loop approvals',
    desc:
      'REST API with automated blast-radius scoring on every pending action. OpenAPI spec included.',
    code: `POST /v1/exceptions/{id}/resolve
{ "decision": "approved",
  "blast_radius_score": 7.4 }`,
  },
  {
    Icon: IconInventory,
    title: 'Inventory + shadow AI discovery',
    desc:
      'Every declared agent, plus the undeclared ones. Risk scoring, ownership, compliance — all in one place.',
    code: `GET /v1/agent-inventory?include_shadow=true
# 142 agents · 17 shadow · 3 high-risk`,
  },
  {
    Icon: IconIntegrations,
    title: 'Slack, ServiceNow, Jira',
    desc:
      'Unified adapters route HITL approvals, incidents, and tickets from a single API call.',
    code: `POST /v1/integrations/slack/notify
{ "channel": "#ai-ops",
  "exception_id": "exc_9f2a4b" }`,
  },
  {
    Icon: IconSDK,
    title: 'SDK + LangChain plugin',
    desc:
      'Instrument any agent in three lines. Full TypeScript types, zero-config tracing, automatic policy enforcement.',
    code: `import { RuneSignalClient } from
  '@runesignal/sdk';
rs.instrument(myAgent);`,
  },
];

const STEPS = [
  { n: '01', title: 'Register agents', desc: 'Declare every AI agent — or let Shadow Discovery find the ones you forgot.' },
  { n: '02', title: 'Define policies', desc: 'Blast-radius thresholds, frameworks, HITL rules, data residency.' },
  { n: '03', title: 'Route through the firewall', desc: 'Every action passes real-time allow / block / escalate.' },
  { n: '04', title: 'Ship evidence', desc: 'One-click compliance reports and audit exports — always current.' },
];

const INTEGRATIONS = [
  'LangChain', 'OpenAI', 'Anthropic', 'AutoGen', 'CrewAI',
  'Slack', 'ServiceNow', 'Jira', 'GitHub', 'PagerDuty',
];

const COMPARE = [
  { feature: 'EU AI Act Article 13 evidence reports', rs: 'yes', credo: 'partial', lakera: 'no' },
  { feature: 'HITL API with blast-radius scoring',    rs: 'yes', credo: 'no',      lakera: 'no' },
  { feature: 'Shadow AI discovery',                   rs: 'yes', credo: 'no',      lakera: 'no' },
  { feature: 'Slack / ServiceNow / Jira adapters',    rs: 'yes', credo: 'partial', lakera: 'no' },
  { feature: 'Developer SDK + LangChain plugin',      rs: 'yes', credo: 'no',      lakera: 'partial' },
  { feature: 'Real-time action firewall',             rs: 'yes', credo: 'no',      lakera: 'yes' },
  { feature: 'Cryptographic audit trail (Ed25519)',   rs: 'yes', credo: 'no',      lakera: 'no' },
  { feature: 'Multi-framework compliance (5+)',       rs: 'yes', credo: 'yes',     lakera: 'no' },
];

const cellLabel = (v: string) =>
  v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Partial';

/* ─── Page ─────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="landing">
      {/* HERO ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-eyebrow">
            <span className="dot" aria-hidden />
            EU AI Act · August 2026 enforcement
          </span>

          <h1 className="hero-title">
            Govern every AI agent <span className="accent">you ship.</span>
          </h1>

          <p className="hero-subtitle">
            RuneSignal is the governance, accountability, and operational
            control plane for AI agent fleets in production — evidence,
            approvals, and inventory from day one.
          </p>

          <div className="hero-cta">
            <Link href="/login?mode=signup" className="btn btn-primary btn-lg">
              Get started free
            </Link>
            <Link href="/#product" className="btn btn-outline btn-lg">
              See the product
            </Link>
          </div>

          <div className="hero-trust">
            <span>SOC 2 Type II in progress</span>
            <span className="sep" aria-hidden />
            <span>EU-hosted deployment</span>
            <span className="sep" aria-hidden />
            <span>Ed25519-signed audit trail</span>
          </div>
        </div>
      </section>

      {/* STATS ────────────────────────────────────────── */}
      <section className="stats-strip" aria-label="At a glance">
        {[
          { v: '142+', l: 'Agents governed per tenant, median' },
          { v: '17', l: 'Shadow agents discovered per rollout' },
          { v: '< 40ms', l: 'Firewall decision latency, p95' },
          { v: '5+', l: 'Compliance frameworks mapped' },
        ].map((s) => (
          <div className="stat-tile" key={s.l}>
            <div className="stat-value">{s.v}</div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </section>

      {/* FEATURES ─────────────────────────────────────── */}
      <section className="section" id="product">
        <header className="section-header">
          <span className="t-eyebrow">Product</span>
          <h2 className="t-h1">Five primitives. One governance plane.</h2>
          <p className="t-body-lg" style={{ color: 'var(--text-secondary)' }}>
            Every feature is an API, not a slideshow. Ship governance the
            same way you ship code.
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

      {/* HOW IT WORKS ─────────────────────────────────── */}
      <section className="section" id="how-it-works">
        <header className="section-header">
          <span className="t-eyebrow">How it works</span>
          <h2 className="t-h1">Four steps to audit-ready.</h2>
        </header>

        <ol className="steps-grid">
          {STEPS.map((s) => (
            <li className="step-card" key={s.n}>
              <div className="step-n">STEP {s.n}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* INTEGRATIONS ─────────────────────────────────── */}
      <section className="section">
        <header className="section-header">
          <span className="t-eyebrow">Integrations</span>
          <h2 className="t-h1">Works with the stack you already run.</h2>
        </header>
        <div className="integration-grid">
          {INTEGRATIONS.map((name) => (
            <div className="integration-pill" key={name}>{name}</div>
          ))}
        </div>
      </section>

      {/* COMPARE ──────────────────────────────────────── */}
      <section className="section">
        <header className="section-header">
          <span className="t-eyebrow">Vs. the category</span>
          <h2 className="t-h1">Depth where it counts.</h2>
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
                    <td><span className={`compare-cell ${row.rs}`}>{cellLabel(row.rs)}</span></td>
                    <td><span className={`compare-cell ${row.credo}`}>{cellLabel(row.credo)}</span></td>
                    <td><span className={`compare-cell ${row.lakera}`}>{cellLabel(row.lakera)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FINAL CTA ────────────────────────────────────── */}
      <section className="final-cta">
        <h2 className="t-h1" style={{ maxWidth: '22ch' }}>Ship governance in an afternoon.</h2>
        <p className="t-body-lg" style={{ color: 'var(--text-secondary)', maxWidth: 560 }}>
          Free to start. EU-hosted. No credit card required.
        </p>
        <div className="hero-cta">
          <Link href="/login?mode=signup" className="btn btn-primary btn-lg">
            Create your tenant
          </Link>
          <Link href="/pricing" className="btn btn-outline btn-lg">
            See pricing
          </Link>
        </div>
      </section>
    </div>
  );
}

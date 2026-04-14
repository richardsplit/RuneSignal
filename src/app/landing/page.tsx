'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ─── SVG Icons ─────────────────────────────────────────── */

function RuneGlyph({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {/* Vertical bar */}
      <line x1="14" y1="3" x2="14" y2="25" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
      {/* Upper left arm */}
      <line x1="14" y1="9" x2="6" y2="4" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
      {/* Upper right arm */}
      <line x1="14" y1="9" x2="22" y2="4" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
      {/* Lower left arm */}
      <line x1="14" y1="17" x2="6" y2="23" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      {/* Lower right arm */}
      <line x1="14" y1="17" x2="22" y2="23" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="16" height="18" rx="2" stroke="#10b981" strokeWidth="1.6" />
      <line x1="7" y1="7" x2="15" y2="7" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="7" y1="11" x2="15" y2="11" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="7" y1="15" x2="11" y2="15" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconHITL() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="8" r="4" stroke="#10b981" strokeWidth="1.6" />
      <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="18" y1="4" x2="22" y2="4" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="18" y1="7" x2="22" y2="7" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconInventory() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="#10b981" strokeWidth="1.6" />
      <rect x="12" y="2" width="8" height="8" rx="1.5" stroke="#10b981" strokeWidth="1.6" />
      <rect x="2" y="12" width="8" height="8" rx="1.5" stroke="#3b82f6" strokeWidth="1.6" />
      <rect x="12" y="12" width="8" height="8" rx="1.5" stroke="#3b82f6" strokeWidth="1.6" />
    </svg>
  );
}

function IconIntegrations() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="4" cy="11" r="2.5" stroke="#10b981" strokeWidth="1.6" />
      <circle cx="18" cy="4" r="2.5" stroke="#10b981" strokeWidth="1.6" />
      <circle cx="18" cy="18" r="2.5" stroke="#3b82f6" strokeWidth="1.6" />
      <line x1="6.5" y1="10" x2="15.5" y2="5.2" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="6.5" y1="12" x2="15.5" y2="16.8" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconSDK() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <polyline points="6,8 2,11 6,14" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16,8 20,11 16,14" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="13" y1="5" x2="9" y2="17" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: 'inline', marginRight: 4 }}>
      <circle cx="8" cy="8" r="7" fill="rgba(16,185,129,0.15)" />
      <polyline points="4.5,8.5 7,11 11.5,5.5" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: 'inline', marginRight: 4 }}>
      <circle cx="8" cy="8" r="7" fill="rgba(239,68,68,0.1)" />
      <line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="10.5" y1="5.5" x2="5.5" y2="10.5" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PartialIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: 'inline', marginRight: 4 }}>
      <circle cx="8" cy="8" r="7" fill="rgba(234,179,8,0.12)" />
      <line x1="5" y1="8" x2="11" y2="8" stroke="#eab308" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Data ──────────────────────────────────────────────── */

const FEATURES = [
  {
    id: 'eu-ai-act',
    Icon: IconReport,
    title: 'EU AI Act Evidence Report Generator',
    desc: 'Auto-generates Article 13 compliance evidence reports with one-click PDF export. Maps every agent decision to specific EU AI Act articles so auditors get instant, defensible proof.',
    code: `curl -X POST https://api.runesignal.io/v1/compliance/reports/eu-ai-act \\
  -H "Authorization: Bearer $RS_API_KEY" \\
  -H "X-Tenant-Id: $TENANT_ID" \\
  -d '{"from":"2026-01-01","to":"2026-07-31","format":"pdf"}'`,
  },
  {
    id: 'hitl',
    Icon: IconHITL,
    title: 'HITL Approval API with Blast Radius Scoring',
    desc: 'Human-in-the-loop REST API with automated blast radius scoring on every pending action. Prevents high-impact agent decisions without human sign-off — OpenAPI spec included.',
    code: `POST /api/v1/exceptions/{id}/resolve
{
  "decision": "approved",
  "blast_radius_score": 7.4,
  "reviewer": "alice@acme.com",
  "justification": "Low-risk data read, no PII"
}`,
  },
  {
    id: 'inventory',
    Icon: IconInventory,
    title: 'Agent Inventory & Shadow AI Discovery',
    desc: 'Discovers undeclared AI agents running anywhere in your infrastructure. Full dashboard with risk scoring, ownership mapping, and compliance status across every agent — declared or not.',
    code: `GET /api/v1/agent-inventory?include_shadow=true&risk_min=6

# Response
{ "agents": 142, "shadow_detected": 17,
  "high_risk": 3, "unowned": 9 }`,
  },
  {
    id: 'adapters',
    Icon: IconIntegrations,
    title: 'Slack, ServiceNow & Jira Adapters',
    desc: 'Unified integration adapter pattern routes HITL approvals to Slack, creates ServiceNow incidents, and opens Jira tickets automatically — all from a single API call.',
    code: `POST /api/v1/integrations/slack/notify
{
  "channel": "#ai-ops",
  "exception_id": "exc_9f2a4b",
  "blast_radius_score": 8.1,
  "action": "approve_or_deny"
}`,
  },
  {
    id: 'sdk',
    Icon: IconSDK,
    title: 'Developer SDK + LangChain Plugin',
    desc: '`@runesignal/sdk` and `@runesignal/langchain-plugin` packages let you instrument any agent in 3 lines. Full TypeScript types, zero-config tracing, automatic policy enforcement.',
    code: `import { RuneSignalClient } from '@runesignal/sdk';
const rs = new RuneSignalClient({ tenantId: process.env.TENANT_ID });
rs.instrument(myAgent);`,
  },
];

const STEPS = [
  { n: '01', title: 'Register Agents', desc: 'Declare every AI agent — or let Shadow AI Discovery find undeclared ones automatically.' },
  { n: '02', title: 'Define Policies', desc: 'Set blast radius thresholds, compliance frameworks, HITL escalation rules, and data residency zones.' },
  { n: '03', title: 'Route Through Firewall', desc: 'Every agent action passes through the RuneSignal firewall for real-time allow/block/escalate decisions.' },
  { n: '04', title: 'Generate Reports', desc: 'One-click EU AI Act evidence reports and audit exports — always current, always audit-ready.' },
];

const INTEGRATIONS = [
  'LangChain', 'OpenAI', 'Anthropic', 'AutoGen', 'CrewAI',
  'Slack', 'ServiceNow', 'Jira', 'GitHub', 'PagerDuty',
];

const COMPARE = [
  { feature: 'EU AI Act Article 13 evidence reports', rs: 'yes', credo: 'partial', lakera: 'no' },
  { feature: 'HITL API with blast radius scoring', rs: 'yes', credo: 'no', lakera: 'no' },
  { feature: 'Shadow AI discovery', rs: 'yes', credo: 'no', lakera: 'no' },
  { feature: 'Slack / ServiceNow / Jira adapters', rs: 'yes', credo: 'partial', lakera: 'no' },
  { feature: 'Developer SDK + LangChain plugin', rs: 'yes', credo: 'no', lakera: 'partial' },
  { feature: 'Real-time action firewall', rs: 'yes', credo: 'no', lakera: 'yes' },
  { feature: 'Cryptographic audit trail (Ed25519)', rs: 'yes', credo: 'no', lakera: 'no' },
  { feature: 'Multi-framework compliance (5+)', rs: 'yes', credo: 'yes', lakera: 'no' },
  { feature: 'Agent inventory dashboard', rs: 'yes', credo: 'partial', lakera: 'no' },
  { feature: 'OpenAPI spec included', rs: 'yes', credo: 'partial', lakera: 'partial' },
];

/* ─── Component ─────────────────────────────────────────── */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const cellVal = (v: string) => {
    if (v === 'yes') return <><CheckIcon /><span style={{ color: '#10b981' }}>Yes</span></>;
    if (v === 'no') return <><CrossIcon /><span style={{ color: '#ef4444' }}>No</span></>;
    return <><PartialIcon /><span style={{ color: '#eab308' }}>Partial</span></>;
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .landing-card { transition: all 0.2s ease; }
        .landing-card:hover {
          border-color: rgba(16,185,129,0.35) !important;
          background: rgba(16,185,129,0.04) !important;
          transform: translateY(-2px);
        }
        .landing-nav-link { transition: color 0.2s; }
        .landing-nav-link:hover { color: #fff !important; }
        .landing-cta-primary { transition: opacity 0.2s, transform 0.15s; }
        .landing-cta-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .landing-cta-secondary { transition: background 0.2s; }
        .landing-cta-secondary:hover { background: rgba(255,255,255,0.1) !important; }
        .badge-pill { transition: background 0.2s, border-color 0.2s; }
        .badge-pill:hover { background: rgba(16,185,129,0.12) !important; border-color: rgba(16,185,129,0.4) !important; }
        .compare-row:hover td { background: rgba(255,255,255,0.02) !important; }
        .step-card:hover { border-color: rgba(59,130,246,0.3) !important; }
        .step-card { transition: border-color 0.2s; }

        pre { white-space: pre-wrap; word-break: break-all; }
        code { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; }

        @media (max-width: 768px) {
          .feat-grid { grid-template-columns: 1fr !important; }
          .stats-strip { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-btns { flex-direction: column !important; }
          .compare-scroll { overflow-x: auto; }
        }
        @media (max-width: 480px) {
          .stats-strip { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ background: '#080812', color: '#e2e8f0', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>

        {/* ── NAV ───────────────────────────────────────────── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? 'rgba(8,8,18,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
          padding: '0 24px',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <RuneGlyph size={28} />
              <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: '#f1f5f9' }}>RuneSignal</span>
            </Link>

            {/* Desktop links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link href="/landing" className="landing-nav-link" style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, padding: '6px 12px', textDecoration: 'none' }}>Product</Link>
              <Link href="/landing" className="landing-nav-link" style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, padding: '6px 12px', textDecoration: 'none' }}>Solutions</Link>
              <Link href="/pricing" className="landing-nav-link" style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, padding: '6px 12px', textDecoration: 'none' }}>Pricing</Link>
              <Link href="/documentation" className="landing-nav-link" style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, padding: '6px 12px', textDecoration: 'none' }}>Docs</Link>
            </div>

            {/* Auth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/login" className="landing-nav-link" style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, padding: '6px 12px', textDecoration: 'none' }}>Sign in</Link>
              <Link href="/login?mode=signup" className="landing-cta-primary" style={{
                background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 600,
                padding: '7px 16px', borderRadius: 8, textDecoration: 'none', display: 'inline-block',
              }}>Get Started Free</Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────── */}
        <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', padding: '160px 24px 100px' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '6px 16px', marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500, letterSpacing: '0.02em' }}>EU AI Act &middot; August 2026 enforcement</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', color: '#f8fafc', maxWidth: 900, margin: '0 auto 24px' }}>
            Five features to govern<br />
            <span style={{ color: '#10b981' }}>every AI agent</span> you ship
          </h1>

          <p style={{ fontSize: 'clamp(17px, 2vw, 21px)', color: '#94a3b8', maxWidth: 680, margin: '0 auto 40px', lineHeight: 1.6 }}>
            EU AI Act reports, HITL blast-radius scoring, shadow AI discovery, cross-platform adapters, and a 3-line developer SDK — all in one compliance firewall for AI agent fleets.
          </p>

          {/* CTAs */}
          <div className="hero-btns" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
            <Link href="/login?mode=signup" className="landing-cta-primary" style={{
              background: '#10b981', color: '#fff', fontSize: 16, fontWeight: 700,
              padding: '14px 28px', borderRadius: 10, textDecoration: 'none', display: 'inline-block',
            }}>Start free trial &rarr;</Link>
            <Link href="/documentation" className="landing-cta-secondary" style={{
              background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 16, fontWeight: 600,
              padding: '14px 28px', borderRadius: 10, textDecoration: 'none', display: 'inline-block',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>View API docs</Link>
          </div>

          {/* Compliance badges */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['EU AI Act', 'GDPR', 'NIST RMF', 'SOC 2', 'HIPAA', 'OWASP Top 10'].map(b => (
              <span key={b} className="badge-pill" style={{
                fontSize: 12, fontWeight: 600, color: '#64748b', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 999, padding: '4px 12px', background: 'rgba(255,255,255,0.03)',
                cursor: 'default', letterSpacing: '0.02em',
              }}>{b}</span>
            ))}
          </div>
        </section>

        {/* ── FEATURE CARDS ─────────────────────────────────── */}
        <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Platform</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc' }}>
              Five features. Unlimited visibility.
            </h2>
          </div>

          <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.id} className="landing-card" style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                {/* Icon + title */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(16,185,129,0.08)', borderRadius: 10, flexShrink: 0, marginTop: 2 }}>
                    <f.Icon />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.35, letterSpacing: '-0.01em' }}>{f.title}</h3>
                </div>

                {/* Description */}
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.65 }}>{f.desc}</p>

                {/* Code block */}
                <pre style={{
                  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: '14px 16px', fontSize: 12, lineHeight: 1.7,
                  color: '#6ee7b7', overflow: 'hidden', flexGrow: 1,
                }}>
                  <code>{f.code}</code>
                </pre>

                {/* Learn more */}
                <Link href="/documentation" className="landing-nav-link" style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', textDecoration: 'none' }}>
                  Learn more &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── STATS STRIP ───────────────────────────────────── */}
        <section style={{ padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="stats-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
            {[
              { val: '< 50ms', label: 'Firewall latency' },
              { val: 'Ed25519', label: 'Cryptographic proof' },
              { val: '5 frameworks', label: 'EU AI Act, NIST, SOC 2, HIPAA, DORA' },
              { val: '3 lines', label: 'To instrument any agent' },
            ].map(s => (
              <div key={s.val}>
                <div style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, color: '#10b981', letterSpacing: '-0.03em', marginBottom: 6 }}>{s.val}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────── */}
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>How it works</p>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc' }}>
              From zero to audit-ready in minutes
            </h2>
          </div>

          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {STEPS.map(s => (
              <div key={s.n} className="step-card" style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: '24px 20px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.1em', marginBottom: 12 }}>{s.n}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── INTEGRATIONS ──────────────────────────────────── */}
        <section style={{ padding: '60px 24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 14, color: '#64748b', fontWeight: 500, marginBottom: 28, letterSpacing: '0.04em' }}>Works with your stack</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 800, margin: '0 auto' }}>
            {INTEGRATIONS.map(i => (
              <span key={i} className="badge-pill" style={{
                fontSize: 13, fontWeight: 600, color: '#94a3b8',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999,
                padding: '6px 16px', background: 'rgba(255,255,255,0.03)', cursor: 'default',
              }}>{i}</span>
            ))}
          </div>
        </section>

        {/* ── COMPARISON TABLE ──────────────────────────────── */}
        <section style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Why RuneSignal</p>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc' }}>
              Built for agentic AI — not retrofitted
            </h2>
          </div>

          <div className="compare-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}>Feature</th>
                  <th style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13, textAlign: 'center' }}>RuneSignal</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13, textAlign: 'center' }}>Credo AI</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13, textAlign: 'center' }}>Lakera</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row, i) => (
                  <tr key={row.feature} className="compare-row" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.feature}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{cellVal(row.rs)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{cellVal(row.credo)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{cellVal(row.lakera)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CTA SECTION ───────────────────────────────────── */}
        <section style={{ padding: '80px 24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            maxWidth: 680, margin: '0 auto', padding: '60px 40px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(59,130,246,0.07) 100%)',
            border: '1px solid rgba(16,185,129,0.18)', borderRadius: 24,
          }}>
            <RuneGlyph size={40} />
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#f8fafc', marginTop: 20, marginBottom: 14, letterSpacing: '-0.03em' }}>
              Start governing your AI agents today
            </h2>
            <p style={{ fontSize: 16, color: '#94a3b8', marginBottom: 36, lineHeight: 1.6 }}>
              Free plan available. No credit card required. Deploy in minutes.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login?mode=signup" className="landing-cta-primary" style={{
                background: '#10b981', color: '#fff', fontSize: 16, fontWeight: 700,
                padding: '14px 32px', borderRadius: 10, textDecoration: 'none', display: 'inline-block',
              }}>Start for free &rarr;</Link>
              <Link href="/documentation" className="landing-cta-secondary" style={{
                background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 16, fontWeight: 600,
                padding: '14px 28px', borderRadius: 10, textDecoration: 'none', display: 'inline-block',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>Read the docs</Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
              {/* Brand */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <RuneGlyph size={22} />
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>RuneSignal</span>
                </div>
                <p style={{ fontSize: 13, color: '#475569', maxWidth: 220, lineHeight: 1.5 }}>
                  The AI agent governance firewall for regulated industries.
                </p>
              </div>

              {/* Links */}
              <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Product</div>
                  {[
                    { label: 'Features', href: '/landing' },
                    { label: 'Pricing', href: '/pricing' },
                    { label: 'Documentation', href: '/documentation' },
                  ].map(l => (
                    <div key={l.label} style={{ marginBottom: 10 }}>
                      <Link href={l.href} className="landing-nav-link" style={{ fontSize: 14, color: '#64748b', textDecoration: 'none' }}>{l.label}</Link>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Company</div>
                  {[
                    { label: 'GitHub', href: 'https://github.com/richardsplit/TrustLayer' },
                    { label: 'Data Processing Agreement', href: '/legal/dpa' },
                    { label: 'Service Level Agreement', href: '/legal/sla' },
                    { label: 'Privacy', href: '/privacy' },
                    { label: 'Terms', href: '/terms' },
                  ].map(l => (
                    <div key={l.label} style={{ marginBottom: 10 }}>
                      <Link href={l.href} className="landing-nav-link" style={{ fontSize: 14, color: '#64748b', textDecoration: 'none' }}>{l.label}</Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#334155' }}>&copy; 2026 RuneSignal. All rights reserved.</span>
              <span style={{ fontSize: 12, color: '#1e293b' }}>
                Built for EU AI Act Article 13 &middot; NIST RMF &middot; SOC 2 &middot; HIPAA &middot; DORA
              </span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

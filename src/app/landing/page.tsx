'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const NAV_PRODUCT = [
  {
    label: 'Runtime Governance',
    items: [
      { icon: '🔥', name: 'AI Action Firewall', desc: 'Real-time block/allow for every agent action', href: '/login' },
      { icon: '⚔️', name: 'Conflict Prevention', desc: 'Stop multi-agent goal conflicts before they escalate', href: '/login' },
      { icon: '🧬', name: 'Cryptographic Provenance', desc: 'Ed25519-signed immutable audit trail for every decision', href: '/login' },
      { icon: '🛡️', name: 'Corporate SOUL', desc: 'Ethics engine — define moral boundaries for your AI fleet', href: '/login' },
    ],
  },
  {
    label: 'Compliance & Risk',
    items: [
      { icon: '📋', name: 'Governance Intelligence', desc: 'Auto-map audit evidence to EU AI Act, NIST RMF, SOC 2', href: '/login' },
      { icon: '🔍', name: 'Decision Explainability', desc: 'Art 13-ready explanations for every AI decision', href: '/login' },
      { icon: '🚨', name: 'Anomaly Detection', desc: 'Behavioural fingerprinting — detect hijacked agents', href: '/login' },
      { icon: '🔴', name: 'Automated Red Teaming', desc: 'OWASP Agentic Top 10 attack simulation', href: '/login' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: '💰', name: 'Agent FinOps', desc: 'Hard budget caps — stop $47k runaway LLM loops', href: '/login' },
      { icon: '🌍', name: 'Data Residency', desc: 'GDPR Art 44 — validate provider/region before every call', href: '/login' },
      { icon: '🤖', name: 'HITL Workflow', desc: 'Human-in-the-loop escalation with SLA enforcement', href: '/login' },
      { icon: '🔐', name: 'NHI Lifecycle', desc: 'Agent identity with cryptographic death certificates', href: '/login' },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { icon: '🤝', name: 'A2A Gateway', desc: 'Govern agent-to-agent protocol traffic', href: '/login' },
      { icon: '🦾', name: 'Physical AI', desc: 'Pre-authorise robot actions before execution', href: '/login' },
      { icon: '🔌', name: 'Plugin System', desc: 'Connect to Jira, Datadog, PagerDuty, Salesforce', href: '/login' },
      { icon: '🏪', name: 'SOUL Marketplace', desc: 'Industry-specific ethics templates, ready to activate', href: '/login' },
    ],
  },
];

const NAV_SOLUTIONS = [
  { icon: '🏦', name: 'Financial Services', desc: 'EU AI Act, MiFID II, DORA compliance', href: '/login' },
  { icon: '🏥', name: 'Healthcare AI', desc: 'HIPAA, FDA 21 CFR, clinical decision governance', href: '/login' },
  { icon: '🛡️', name: 'Insurance', desc: 'FCRA claim thresholds, Lloyd\'s compliance', href: '/login' },
  { icon: '🏭', name: 'Industrial / Robotics', desc: 'Physical AI governance for autonomous systems', href: '/login' },
  { icon: '🏛️', name: 'Government & Defence', desc: 'FISMA, FedRAMP, NIST SP 800-53', href: '/login' },
  { icon: '💻', name: 'AI-Native SaaS', desc: 'Scale agent fleets with trust built in', href: '/login' },
];

const FEATURES = [
  {
    stat: '< 50ms',
    label: 'Firewall latency',
    desc: 'Every agent action evaluated in real time without slowing your pipeline.',
  },
  {
    stat: 'Ed25519',
    label: 'Cryptographic proof',
    desc: 'Every decision signed and immutable. Court-admissible audit trail.',
  },
  {
    stat: '17',
    label: 'Governance modules',
    desc: 'From FinOps to Physical AI — one platform, complete coverage.',
  },
  {
    stat: '0',
    label: 'Competitors with all of this',
    desc: 'No other vendor ships runtime governance with cryptographic provenance.',
  },
];

const COMPLIANCE_BADGES = [
  'EU AI Act', 'GDPR Art 44', 'NIST RMF', 'SOC 2', 'HIPAA', 'DORA',
  'OWASP Agentic Top 10', 'FISMA', 'FCRA', 'ISO 42001',
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Register your agents',
    desc: 'Add every AI agent to TrustLayer\'s Non-Human Identity registry. Each gets a cryptographic identity and scoped permissions.',
  },
  {
    step: '02',
    title: 'Define your SOUL',
    desc: 'Set your Corporate SOUL — the ethical boundaries your agents must operate within. Or activate a pre-built industry template in one click.',
  },
  {
    step: '03',
    title: 'Route every action through the firewall',
    desc: 'Before any agent action executes, TrustLayer evaluates it against your SOUL, permissions, budget caps, and data residency policy.',
  },
  {
    step: '04',
    title: 'Prove compliance instantly',
    desc: 'Every decision is cryptographically signed and auto-mapped to EU AI Act, NIST RMF, or SOC 2 articles. Share with regulators in one click.',
  },
];

/* ─────────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────────── */
function NavDropdown({ items, label }: { items: typeof NAV_PRODUCT | typeof NAV_SOLUTIONS; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isProduct = Array.isArray(items) && items.length > 0 && 'items' in items[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: open ? '#fff' : 'rgba(255,255,255,0.75)',
          fontSize: '0.9rem', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '6px 10px', borderRadius: '8px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => !open && (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(15, 15, 30, 0.98)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
          padding: '20px', zIndex: 100,
          width: isProduct ? '720px' : '360px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          {isProduct ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {(items as typeof NAV_PRODUCT).map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    {group.label}
                  </div>
                  {group.items.map(item => (
                    <Link key={item.name} href={item.href} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        padding: '8px', borderRadius: '10px', marginBottom: '4px',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>{item.desc}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
              {(items as typeof NAV_SOLUTIONS).map(item => (
                <Link key={item.name} href={item.href} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '10px', borderRadius: '10px',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '2px' }}>{(item as any).icon}</span>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      background: '#080812',
      color: '#fff',
      minHeight: '100vh',
      overflowX: 'hidden',
    }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '0 24px',
        background: scrolled ? 'rgba(8,8,18,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'background 0.3s, backdrop-filter 0.3s, border-color 0.3s',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '64px',
        }}>
          {/* Logo */}
          <Link href="/landing" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0,
            }}>🔒</div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.3px' }}>TrustLayer</span>
          </Link>

          {/* Centre nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <NavDropdown label="Product" items={NAV_PRODUCT} />
            <NavDropdown label="Solutions" items={NAV_SOLUTIONS} />
            <Link href="/login" style={{
              textDecoration: 'none', color: 'rgba(255,255,255,0.75)',
              fontSize: '0.9rem', fontWeight: 500, padding: '6px 10px',
              borderRadius: '8px', transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
            >Pricing</Link>
            <Link href="/documentation" style={{
              textDecoration: 'none', color: 'rgba(255,255,255,0.75)',
              fontSize: '0.9rem', fontWeight: 500, padding: '6px 10px',
              borderRadius: '8px', transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
            >Docs</Link>
          </div>

          {/* Auth buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link href="/login" style={{
              textDecoration: 'none', color: 'rgba(255,255,255,0.75)',
              fontSize: '0.875rem', fontWeight: 500,
              padding: '8px 16px', borderRadius: '10px',
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
            >Sign in</Link>
            <Link href="/login?mode=signup" style={{
              textDecoration: 'none',
              background: '#fff', color: '#080812',
              fontSize: '0.875rem', fontWeight: 600,
              padding: '8px 18px', borderRadius: '10px',
              transition: 'background 0.2s, transform 0.1s',
              display: 'inline-block',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1)'; }}
            >Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '20%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: '50px', padding: '6px 16px', marginBottom: '32px',
          fontSize: '0.8rem', color: '#10b981', fontWeight: 600, letterSpacing: '0.3px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          EU AI Act ready — August 2026 enforcement
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
          fontWeight: 700, lineHeight: 1.05,
          letterSpacing: '-0.04em', marginBottom: '24px',
          maxWidth: '900px',
        }}>
          Governance for{' '}
          <span style={{
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            AI agents
          </span>{' '}
          that actually works at runtime.
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'rgba(255,255,255,0.55)', maxWidth: '620px',
          lineHeight: 1.6, marginBottom: '40px',
        }}>
          TrustLayer intercepts every AI agent action before it executes — evaluating intent, checking ethics, enforcing budgets, and signing a cryptographic proof of every decision.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '72px' }}>
          <Link href="/login?mode=signup" style={{
            textDecoration: 'none',
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            color: '#fff', fontSize: '1rem', fontWeight: 600,
            padding: '14px 28px', borderRadius: '12px',
            transition: 'opacity 0.2s, transform 0.1s',
            display: 'inline-block',
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Start free trial →
          </Link>
          <Link href="/documentation" style={{
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.06)', color: '#fff',
            fontSize: '1rem', fontWeight: 500,
            padding: '14px 28px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'background 0.2s',
            display: 'inline-block',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            View API docs
          </Link>
        </div>

        {/* Social proof bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginRight: '8px' }}>Covers</span>
          {COMPLIANCE_BADGES.map(badge => (
            <span key={badge} style={{
              fontSize: '0.72rem', fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '4px 10px', borderRadius: '6px',
            }}>{badge}</span>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{
        padding: '80px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1px', background: 'rgba(255,255,255,0.06)',
          borderRadius: '20px', overflow: 'hidden',
        }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{
              background: '#080812', padding: '40px 32px', textAlign: 'center',
            }}>
              <div style={{
                fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: '8px', letterSpacing: '-0.02em',
              }}>{f.stat}</div>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px', fontSize: '0.95rem' }}>{f.label}</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
            How it works
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '16px' }}>
            From zero to governed in minutes.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.05rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
            TrustLayer wraps around your existing agent stack. No rebuilding. No rearchitecting.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.step} style={{
              padding: '32px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '20px', right: '20px',
                fontSize: '3rem', fontWeight: 800, color: 'rgba(255,255,255,0.04)',
                lineHeight: 1, userSelect: 'none',
              }}>{step.step}</div>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b98130, #3b82f630)',
                border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', fontWeight: 800, color: '#10b981',
                marginBottom: '20px',
              }}>{i + 1}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', color: '#fff' }}>{step.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MODULES GRID ── */}
      <section style={{
        padding: '100px 24px',
        background: 'rgba(255,255,255,0.015)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
              17 Governance Modules
            </div>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '16px' }}>
              Every dimension of AI governance.<br />In one platform.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {NAV_PRODUCT.flatMap(g => g.items).map(item => (
              <Link key={item.name} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '20px 22px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)';
                    e.currentTarget.style.background = 'rgba(16,185,129,0.05)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{item.name}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── VS COMPETITORS ── */}
      <section style={{ padding: '100px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '12px' }}>
            Everything competitors don't ship.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', lineHeight: 1.6 }}>
            Credo AI produces reports. Lakera guards prompts. TrustLayer governs the entire agent lifecycle.
          </p>
        </div>

        <div style={{
          borderRadius: '20px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Capability</th>
                {['Credo AI', 'Lakera', 'TrustLayer'].map(name => (
                  <th key={name} style={{
                    padding: '16px 20px', textAlign: 'center', fontSize: '0.85rem',
                    color: name === 'TrustLayer' ? '#10b981' : 'rgba(255,255,255,0.55)',
                    fontWeight: name === 'TrustLayer' ? 700 : 500,
                  }}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Runtime block/allow firewall', false, 'partial', true],
                ['Ed25519 cryptographic proof', false, false, true],
                ['Multi-agent conflict prevention', false, false, true],
                ['Corporate ethics engine (SOUL)', false, false, true],
                ['FinOps budget enforcement', false, false, true],
                ['GDPR data residency validation', false, false, true],
                ['EU AI Act evidence mapping', 'partial', false, true],
                ['Agent behavioural anomaly detection', false, false, true],
                ['Physical AI governance', false, false, true],
                ['Plugin ecosystem', false, false, true],
              ].map(([label, credo, lakera, tl]) => (
                <tr key={String(label)} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 20px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>{String(label)}</td>
                  {[credo, lakera, tl].map((val, i) => (
                    <td key={i} style={{ padding: '14px 20px', textAlign: 'center', fontSize: '1rem' }}>
                      {val === true ? '✅' : val === 'partial' ? '🟡' : '❌'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: '100px 24px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '20px', maxWidth: '700px', margin: '0 auto 20px' }}>
            Start governing your AI agents today.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.05rem', marginBottom: '40px', lineHeight: 1.6 }}>
            Free plan. No credit card required. 5 minutes to your first cryptographic certificate.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login?mode=signup" style={{
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              color: '#fff', fontSize: '1rem', fontWeight: 600,
              padding: '16px 32px', borderRadius: '12px',
              transition: 'opacity 0.2s, transform 0.1s',
              display: 'inline-block',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >Create free account →</Link>
            <Link href="/documentation" style={{
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)',
              fontSize: '1rem', fontWeight: 500,
              padding: '16px 32px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'inline-block',
            }}>Read the docs</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px', marginBottom: '48px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔒</span> TrustLayer
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Runtime governance for AI agent fleets.
              </p>
            </div>
            {[
              { heading: 'Product', links: ['AI Action Firewall', 'Corporate SOUL', 'FinOps Control', 'Red Teaming', 'A2A Gateway'] },
              { heading: 'Solutions', links: ['Financial Services', 'Healthcare AI', 'Insurance', 'Government', 'Industrial'] },
              { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'DPA', 'SLA', 'Security'] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                  {col.heading}
                </div>
                {col.links.map(link => (
                  <div key={link} style={{ marginBottom: '10px' }}>
                    <Link href="/login" style={{
                      textDecoration: 'none', fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.5)',
                      transition: 'color 0.2s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                    >{link}</Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '24px', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>
              © 2026 TrustLayer. All rights reserved.
            </span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>
              EU AI Act ready · GDPR compliant · SOC 2 in progress
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

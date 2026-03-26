'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-10% 0px -70% 0px' }
    );

    const sections = ['getting-started', 'architecture', 's3-provenance', 's6-identity', 's1-conflict', 's7-hitl', 's5-insurance'];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple alert for feedback (could be a toast later)
    const toast = document.createElement('div');
    toast.textContent = 'Copied to clipboard!';
    toast.style.position = 'fixed';
    toast.style.bottom = '2rem';
    toast.style.right = '2rem';
    toast.style.background = 'var(--color-primary-emerald)';
    toast.style.color = 'white';
    toast.style.padding = '0.75rem 1.5rem';
    toast.style.borderRadius = 'var(--radius-md)';
    toast.style.zIndex = '1000';
    toast.style.fontSize = '0.875rem';
    toast.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const navItems = [
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'architecture', label: 'Architecture' },
    { id: 's3-provenance', label: 'S3 Provenance Engine' },
    { id: 's6-identity', label: 'S6 Identity & Permissions' },
    { id: 's1-conflict', label: 'S1 Conflict Arbiter' },
    { id: 's7-hitl', label: 'S7 HITL Routing' },
    { id: 's5-insurance', label: 'S5 Insurance Micro-OS' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth'
      });
      window.history.pushState(null, '', `#${id}`);
      setActiveSection(id);
    }
  };

  return (
    <div style={{ padding: '0 2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>Documentation</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Enterprise AI Governance Protocol & SDK Reference</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3.5fr', gap: '3rem', alignItems: 'start' }}>
        {/* Sidebar Nav */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contents</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => (
              <li key={item.id}>
                <a 
                  href={`#${item.id}`} 
                  onClick={(e) => handleNavClick(e, item.id)}
                  style={{ 
                    display: 'block',
                    padding: '0.6rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    color: activeSection === item.id ? 'var(--color-primary-emerald)' : 'var(--color-text-muted)', 
                    background: activeSection === item.id ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                    textDecoration: 'none', 
                    fontSize: '0.9rem',
                    fontWeight: activeSection === item.id ? 600 : 400,
                    transition: 'all 0.2s',
                    borderLeft: `2px solid ${activeSection === item.id ? 'var(--color-primary-emerald)' : 'transparent'}`
                  }}
                  className={activeSection !== item.id ? "hover-highlight" : ""}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Main Doc Content */}
        <div className="glass-panel" style={{ padding: '3rem', maxWidth: '1000px' }}>
          
          <section id="getting-started" style={{ marginBottom: '5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-main)' }}>Getting Started</h2>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-primary-emerald)', borderRadius: '12px', fontWeight: 600 }}>QUICKSTART</span>
            </div>
            
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '2rem', fontSize: '1.1rem' }}>
              TrustLayer provides an immutable, cryptographically verifiable ledger for autonomous AI agent fleets. 
              Gain zero-trust observability into all inputs, outputs, and semantic intents generated by your agents.
            </p>

            <div style={{ position: 'relative' }}>
              <div style={{ background: 'var(--color-bg-main)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)', fontFamily: 'var(--font-mono)', color: 'var(--color-info-cyan)', fontSize: '0.95rem' }}>
                <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}># Install the Enterprise SDK</div>
                <span style={{ color: 'var(--color-text-muted)' }}>$ </span>npm install @trustlayer/sdk
              </div>
              <button 
                onClick={() => copyToClipboard('npm install @trustlayer/sdk')}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '4px', color: 'var(--color-text-muted)', fontSize: '0.75rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
                className="hover-highlight"
              >
                Copy
              </button>
            </div>
          </section>

          <section id="architecture" style={{ marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '8px', height: '24px', background: 'var(--color-primary-emerald)', borderRadius: '4px' }}></div>
              Platform Architecture
            </h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '2rem' }}>
              TrustLayer is built on a distributed micro-services architecture designed for sub-10ms governance enforcement.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '1rem' }}>High-Speed Edge Functions</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>Intercept and hash all agent tool calls globally with automatic failover and state replication.</p>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '1rem' }}>Semantic Vector Registry</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>Low-latency intent collision detection using high-dimensional embeddings and pgvector storage.</p>
              </div>
            </div>
          </section>

          <section id="s3-provenance" style={{ marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>S3 Provenance Engine</h2>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.03)', borderLeft: '4px solid var(--color-primary-emerald)', marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--color-text-main)', fontWeight: 500, margin: 0 }}>Every agent response is hashed and signed with an Ed25519 cryptographic key at the source.</p>
            </div>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              This creates a non-repudiable audit trail. If an agent hallucination causes financial loss, the S3 module provides the forensic evidence required for root cause analysis and insurance payout.
            </p>
          </section>

          <section id="s6-identity" style={{ marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>S6 Identity & Permissions</h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              Enforce "Least Privilege" for AI. Unlike human users, agents require dynamic, session-based permissions that expire instantly.
            </p>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--color-bg-main)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)', fontFamily: 'var(--font-mono)', color: 'var(--color-info-cyan)', fontSize: '0.85rem' }}>
                <div style={{ color: 'rgba(255,255,255,0.2)' }}># Example Permission Request</div>
                <span style={{ color: 'var(--color-warning-amber)' }}>client</span>.<span style={{ color: 'var(--color-info-cyan)' }}>requestPermission</span>(&quot;read:customer_pii&quot;, {'{'}&quot;reason&quot;: &quot;billing_reconciliation&quot;{'}'});
              </div>
              <button 
                onClick={() => copyToClipboard('client.requestPermission("read:customer_pii", {"reason": "billing_reconciliation"});')}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '4px', color: 'var(--color-text-muted)', fontSize: '0.75rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
                className="hover-highlight"
              >
                Copy
              </button>
            </div>
          </section>

          <section id="s1-conflict" style={{ marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>S1 Conflict Arbiter</h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7' }}>
              The S1 arbiter monitors the "Global Semantic Intent Stream." If two agents independently decide to perform conflicting actions—such as two different customer service agents offering two different discounts to the same user—the Arbiter resolves the conflict based on pre-defined priority heuristics.
            </p>
          </section>

          <section id="s7-hitl" style={{ marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>S7 HITL Routing</h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7' }}>
              Graceful degradation to human intelligence. When confidence scores drop below the &quot;Safety Threshold&quot;, S7 routes the full context window to a human expert.
            </p>
          </section>

          <section id="s5-insurance" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>S5 Insurance Micro-OS</h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7' }}>
              Programmable liability coverage. Policyholders can subscribe to &quot;Safe Intent&quot; insurance, where premiums are recalculated hourly based on the real-time risk profiles of their active agent fleet.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}

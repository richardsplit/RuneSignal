'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/* ── Checkmark icon ────────────────────────────────────────────────────── */
const CheckCircle = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="32" fill="var(--success-bg)" />
    <circle cx="32" cy="32" r="24" stroke="var(--success)" strokeWidth="2" fill="none" />
    <path d="M21 32l8 8 14-14" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RuneGlyph = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <line x1="12" y1="3" x2="12" y2="21" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="8" x2="7"  y2="13" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="8" x2="17" y2="13" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="5" r="1.5" fill="var(--info)" />
  </svg>
);

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [countdown, setCountdown] = useState(8);

  /* Auto-redirect after 8 s */
  useEffect(() => {
    if (countdown <= 0) { router.push('/billing'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--canvas)',
      textAlign: 'center',
    }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem' }}>
        <RuneGlyph />
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>RuneSignal</span>
      </Link>

      {/* Card */}
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '20px',
        padding: '3rem 4rem',
        maxWidth: '520px',
        width: '100%',
      }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <CheckCircle />
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          marginBottom: '0.75rem',
        }}>
          Subscription activated
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1rem',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}>
          Your plan is now live. All features are unlocked — your agents are governed.
        </p>

        {sessionId && (
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '2rem',
            fontSize: '0.75rem',
            wordBreak: 'break-all',
          }}>
            Session: {sessionId}
          </div>
        )}

        {/* What's unlocked */}
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '2rem',
          textAlign: 'left',
        }}>
          <div className="t-eyebrow" style={{ color: 'var(--success)', marginBottom: '0.75rem' }}>
            Now available
          </div>
          {[
            'Unlimited agent inventory',
            'HITL Approval API + blast radius scoring',
            'Shadow AI discovery dashboard',
            'EU AI Act evidence report generator',
            'Slack / ServiceNow / Jira adapters',
            'SDK + LangChain plugin',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7l3 3 5-5" stroke="var(--success)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{f}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link href="/billing" className="btn btn-ghost" style={{ textDecoration: 'none' }}>View billing</Link>
          <Link href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>Go to dashboard →</Link>
        </div>

        <p className="t-caption" style={{ marginTop: '1.5rem' }}>
          Redirecting to billing in {countdown}s
        </p>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p className="t-body-sm text-tertiary">Loading…</p></div>}>
      <BillingSuccessContent />
    </Suspense>
  );
}

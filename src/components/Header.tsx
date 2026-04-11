'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

/* ── Route → breadcrumb label ────────────────────────────────────────── */
const ROUTE_LABELS: Record<string, { section: string | null; title: string }> = {
  '/':           { section: null,              title: 'Dashboard'       },
  '/provenance': { section: 'Governance',      title: 'Provenance'      },
  '/conflict':   { section: 'Governance',      title: 'Conflict Arbiter'},
  '/exceptions': { section: 'Governance',      title: 'Review Queue'    },
  '/audit':      { section: 'Governance',      title: 'Audit Trail'     },
  '/identity':   { section: 'Risk & Identity', title: 'Agent Identity'  },
};

/* ── Icons ───────────────────────────────────────────────────────────── */
const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5a5 5 0 0 1 5 5v2.5l1 1.5H1.5L2.5 9V6.5a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    <path d="M6 12.5c0 .83.67 1.5 1.5 1.5S9 13.33 9 12.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
  </svg>
);

const DocsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2 2h7l2 2v7H2V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M4.5 5.5h4M4.5 7.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

/* ── Component ───────────────────────────────────────────────────────── */
export default function Header() {
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const route = ROUTE_LABELS[pathname] ?? { section: null, title: pathname };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      height: '52px',
      flexShrink: 0,
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-base)',
    }}>

      {/* Left — breadcrumb + env chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {route.section && (
          <>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              {route.section}
            </span>
            <span style={{ color: 'var(--border-strong)', fontSize: '0.75rem' }}>/</span>
          </>
        )}
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>
          {route.title}
        </span>

        {/* Environment chip */}
        <span style={{
          marginLeft: '0.5rem',
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          background: 'var(--accent-dim)',
          color: 'var(--accent)',
          border: '1px solid var(--accent-border)',
        }}>
          Production
        </span>
      </div>

      {/* Right — actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>

        {/* Docs */}
        <button
          className="btn btn-ghost"
          style={{ gap: '0.375rem', fontSize: '0.8125rem' }}
          onClick={() => router.push('/documentation')}
        >
          <DocsIcon />
          Docs
        </button>

        {/* Separator */}
        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 0.25rem' }} />

        {/* Connect agent */}
        <button
          className="btn btn-primary"
          style={{ gap: '0.375rem' }}
          onClick={() => router.push('/identity')}
        >
          <PlusIcon />
          Connect Agent
        </button>

        {/* Notifications */}
        <button
          className="btn btn-ghost"
          style={{ width: '32px', height: '32px', padding: 0, position: 'relative', borderRadius: '6px' }}
          onClick={() => showToast('No new notifications', 'info')}
          aria-label="Notifications"
        >
          <BellIcon />
          <span style={{
            position: 'absolute',
            top: '7px',
            right: '7px',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: 'var(--warning)',
            border: '1.5px solid var(--bg-base)',
          }} />
        </button>

        {/* Avatar */}
        <button
          onClick={() => router.push('/account-settings')}
          aria-label="User profile"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--bg-surface-3)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.625rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          RG
        </button>

      </div>
    </header>
  );
}

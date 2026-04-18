'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/* ── Route → breadcrumb label ────────────────────────────────────── */
const ROUTE_LABELS: Record<string, { section: string | null; title: string }> = {
  '/dashboard':  { section: null,              title: 'Dashboard'         },
  '/provenance': { section: 'Governance',      title: 'Provenance'        },
  '/conflict':   { section: 'Governance',      title: 'Conflict Arbiter'  },
  '/exceptions': { section: 'Governance',      title: 'Review Queue'      },
  '/audit':      { section: 'Governance',      title: 'Audit Trail'       },
  '/identity':   { section: 'Operations',      title: 'Agent Identity'    },
  '/firewall':   { section: null,              title: 'Firewall'          },
  '/compliance': { section: 'Intelligence',    title: 'Governance Intel'  },
  '/finops':     { section: 'Operations',      title: 'FinOps'            },
};

/* ── Icons ───────────────────────────────────────────────────────── */
const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M7.5 1.5a5 5 0 0 1 5 5v2.5l1 1.5H1.5L2.5 9V6.5a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    <path d="M6 12.5c0 .83.67 1.5 1.5 1.5S9 13.33 9 12.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);
const DocsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M2 2h7l2 2v7H2V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M4.5 5.5h4M4.5 7.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function Header() {
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const route = ROUTE_LABELS[pathname] ?? { section: null, title: pathname };

  return (
    <header className="app-topbar" role="banner">
      {/* Left — breadcrumb + env chip */}
      <div className="app-topbar-left">
        {route.section && (
          <>
            <span className="app-crumb-section">{route.section}</span>
            <span className="app-crumb-sep" aria-hidden>/</span>
          </>
        )}
        <span className="app-crumb-title">{route.title}</span>
        <span className="env-chip" title="Environment">Production</span>
      </div>

      {/* Right — actions */}
      <div className="app-topbar-right">
        <ThemeToggle variant="icon" />

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.push('/documentation')}
        >
          <DocsIcon />
          <span>Docs</span>
        </button>

        <div className="app-topbar-divider" aria-hidden />

        <button
          className="btn btn-primary btn-sm"
          onClick={() => router.push('/identity')}
        >
          <PlusIcon />
          <span>Connect agent</span>
        </button>

        <button
          className="btn btn-icon btn-ghost notif-btn"
          onClick={() => showToast('No new notifications', 'info')}
          aria-label="Notifications"
        >
          <BellIcon />
          <span className="notif-dot" aria-hidden />
        </button>

        <button
          onClick={() => router.push('/account-settings')}
          aria-label="Account"
          className="avatar-btn"
        >
          RG
        </button>
      </div>
    </header>
  );
}

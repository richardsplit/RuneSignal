'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { createBrowserClient } from '@lib/db/supabase';
import type { User } from '@supabase/supabase-js';

/* ── Route → breadcrumb label ────────────────────────────────────── */
const ROUTE_LABELS: Record<string, { section: string | null; title: string }> = {
  '/dashboard':                   { section: null,              title: 'Dashboard'            },
  '/firewall':                    { section: null,              title: 'Firewall'             },
  '/provenance':                  { section: 'Governance',      title: 'Provenance'           },
  '/conflict':                    { section: 'Governance',      title: 'Conflict Arbiter'     },
  '/incidents':                   { section: 'Governance',      title: 'Incidents'            },
  '/exceptions':                  { section: 'Governance',      title: 'Review Queue'         },
  '/audit':                       { section: 'Governance',      title: 'Audit Trail'          },
  '/evidence':                    { section: 'Evidence Plane',  title: 'Evidence Packs'       },
  '/ledger':                      { section: 'Evidence Plane',  title: 'Decision Ledger'      },
  '/registry':                    { section: 'Evidence Plane',  title: 'Agent Registry'       },
  '/insurance':                   { section: 'Evidence Plane',  title: 'Insurance Export'     },
  '/explain':                     { section: 'Intelligence',    title: 'Explainability'       },
  '/compliance':                  { section: 'Intelligence',    title: 'Governance Intel'     },
  '/compliance/reports':          { section: 'Intelligence',    title: 'Compliance Reports'   },
  '/compliance/evidence':         { section: 'Intelligence',    title: 'Evidence Wizard'      },
  '/controls':                    { section: 'Intelligence',    title: 'Controls'             },
  '/anomaly':                     { section: 'Intelligence',    title: 'Anomaly Detection'    },
  '/identity':                    { section: 'Operations',      title: 'Agent Identity'       },
  '/nhi':                         { section: 'Operations',      title: 'NHI Lifecycle'        },
  '/finops':                      { section: 'Operations',      title: 'FinOps'               },
  '/sovereignty':                 { section: 'Operations',      title: 'Data Residency'       },
  '/a2a':                         { section: 'Advanced',        title: 'A2A Gateway'          },
  '/account-settings':            { section: 'Platform',        title: 'Account Settings'     },
  '/account-settings/mfa':        { section: 'Platform',        title: 'Security & MFA'       },
  '/account-settings/sso':        { section: 'Platform',        title: 'SSO Configuration'    },
  '/account-settings/integrations': { section: 'Platform',      title: 'Integrations'         },
  '/billing':                     { section: 'Platform',        title: 'Billing'              },
  '/plugins':                     { section: 'Platform',        title: 'Plugins'              },
  '/documentation':               { section: null,              title: 'Documentation'        },
  '/tenant-management':           { section: 'Platform',        title: 'Tenant Management'    },
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

function resolveRoute(pathname: string) {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  const match = Object.keys(ROUTE_LABELS)
    .filter(k => pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0];
  if (match) return ROUTE_LABELS[match];
  const segment = '/' + pathname.split('/').filter(Boolean)[0];
  return { section: null, title: segment.slice(1).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
}

export default function Header() {
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const route = resolveRoute(pathname);

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'RG';

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
          className="btn btn-icon btn-ghost notif-btn"
          onClick={() => showToast('No new notifications', 'info')}
          aria-label="Notifications"
        >
          <BellIcon />
          <span className="notif-dot" aria-hidden />
        </button>

        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            className="avatar-btn"
          >
            {initials}
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 224,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 999,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: '0.175rem' }}>
                  {user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email ?? 'Not signed in'}
                </div>
              </div>

              {[
                { label: 'Account Settings', href: '/account-settings' },
                { label: 'Security & MFA',   href: '/account-settings/mfa' },
                { label: 'Billing',           href: '/billing' },
              ].map(item => (
                <button
                  key={item.href}
                  onClick={() => { setMenuOpen(false); router.push(item.href); }}
                  style={{ display: 'block', width: '100%', padding: '0.5rem 1rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                  className="hover-surface"
                >
                  {item.label}
                </button>
              ))}

              <div style={{ height: 1, background: 'var(--border-subtle)' }} />

              <button
                onClick={handleLogout}
                style={{ display: 'block', width: '100%', padding: '0.5rem 1rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--danger)', fontFamily: 'inherit' }}
                className="hover-surface"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

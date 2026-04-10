'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/SidebarContext';

/* ── SVG Icons ──────────────────────────────────────────────────────── */
const Icon = {
  Dashboard: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
    </svg>
  ),
  Provenance: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1L13 4v4c0 3.3-2.5 5.7-5.5 6.5C4.5 13.7 2 11.3 2 8V4L7.5 1z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      <path d="M5 7.5l1.8 1.8L10 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Identity: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M2 13c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  Conflict: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2v5M7.5 10v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M1.5 12.5L7.5 2l6 10.5H1.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  ),
  Exceptions: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M5 7.5h5M7.5 5v5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  Insurance: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 3h11v6.5c0 2-1.8 3.5-5.5 4C3.8 13 2 11.5 2 9.5V3z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      <path d="M5 7l1.8 1.8L10 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Audit: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M4 5h7M4 7.5h7M4 10h4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  Search: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8.5 8.5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  CollapseLeft: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ExpandRight: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ── Nav config ─────────────────────────────────────────────────────── */
type NavItem  = { label: string; href: string; icon: React.FC; badge?: string };
type NavGroup = { section: string | null; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    section: null,
    items: [
      { label: 'Dashboard',        href: '/',           icon: Icon.Dashboard  },
    ],
  },
  {
    section: 'Compliance',
    items: [
      { label: 'Compliance Reports', href: '/dashboard/compliance/reports', icon: Icon.Audit },
      { label: 'Agent Inventory',    href: '/dashboard/agents',             icon: Icon.Identity },
    ],
  },
  {
    section: 'Governance',
    items: [
      { label: 'Provenance',       href: '/provenance', icon: Icon.Provenance },
      { label: 'Conflict Arbiter', href: '/conflict',   icon: Icon.Conflict   },
      { label: 'Review Queue',     href: '/exceptions', icon: Icon.Exceptions, badge: '3' },
      { label: 'Audit Trail',      href: '/audit',      icon: Icon.Audit      },
    ],
  },
];

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
}

/* ── Tooltip for collapsed icon state ───────────────────────────────── */
function NavItem({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const IconEl = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '0.5625rem',
        padding: collapsed ? '0.5rem' : '0.5rem 0.625rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: '6px',
        textDecoration: 'none',
        fontSize: '0.8125rem',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--bg-surface-2)' : 'transparent',
        transition: 'background var(--t-fast), color var(--t-fast)',
        marginBottom: '1px',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
        }
      }}
    >
      {active && (
        <span style={{
          position: 'absolute',
          left: 0,
          top: '20%',
          height: '60%',
          width: '2px',
          background: 'var(--accent)',
          borderRadius: '0 2px 2px 0',
        }} />
      )}
      <span style={{ color: active ? 'var(--accent)' : 'currentColor', flexShrink: 0, opacity: active ? 1 : 0.7 }}>
        <IconEl />
      </span>
      {!collapsed && (
        <>
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge && (
            <span style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              background: 'var(--warning-bg)',
              color: 'var(--warning)',
              border: '1px solid var(--warning-border)',
              borderRadius: '3px',
              padding: '0.1rem 0.3rem',
              lineHeight: 1.4,
            }}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

/* ── Component ──────────────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname  = usePathname();
  const { collapsed, toggle } = useSidebar();
  const W = collapsed ? '56px' : '220px';

  return (
    <aside style={{
      width: W,
      flexShrink: 0,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      transition: 'width 0.2s ease',
    }}>

      {/* Brand */}
      <div style={{
        padding: collapsed ? '1.125rem 0' : '1.125rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '0.625rem',
        flexShrink: 0,
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
          <rect width="22" height="22" rx="5" fill="var(--accent)"/>
          <path d="M6 8h10M11 8v7M8 11h6" stroke="#09090b" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        {!collapsed && (
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            TrustLayer
          </span>
        )}
      </div>

      {/* Search / ⌘K — hide in icon mode */}
      {!collapsed && (
        <div style={{ padding: '0.625rem 0.625rem 0' }}>
          <button
            onClick={openCommandPalette}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4375rem 0.625rem',
              borderRadius: '6px',
              background: 'var(--bg-surface-1)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              transition: 'border-color var(--t-fast)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            <Icon.Search />
            <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
            <kbd style={{ padding: '0.1rem 0.3rem', borderRadius: '3px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', fontSize: '0.5625rem', lineHeight: 1.6, color: 'var(--text-muted)', fontFamily: 'inherit' }}>⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '0.5rem 0.375rem' : '0.375rem 0.625rem' }}>
        {NAV.map((group, gi) => (
          <div key={gi} style={{ marginBottom: '0.25rem' }}>
            {!collapsed && group.section && (
              <div style={{
                padding: '0.5rem 0.625rem 0.3125rem',
                fontSize: '0.625rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}>
                {group.section}
              </div>
            )}
            {collapsed && group.section && gi > 0 && (
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.5rem 0.25rem' }} />
            )}
            {group.items.map(item => (
              <NavItem
                key={item.href}
                item={item}
                active={pathname === item.href}
                collapsed={collapsed}
              />
            ))}
            {!collapsed && gi < NAV.length - 1 && group.section && (
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.5rem 0.375rem' }} />
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '0.875rem 0' : '0.875rem 1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        flexShrink: 0,
      }}>
        {/* Collapse toggle */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-end',
            width: '100%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '0.25rem',
            borderRadius: '5px',
            transition: 'color var(--t-fast)',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
        >
          {collapsed ? <Icon.ExpandRight /> : <Icon.CollapseLeft />}
        </button>

        {!collapsed && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="status-dot online" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>All systems operational</span>
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', paddingLeft: '0.875rem' }}>Edge v1.0.0</div>
          </>
        )}
      </div>

    </aside>
  );
}

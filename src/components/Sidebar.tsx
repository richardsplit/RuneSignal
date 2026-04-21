'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/SidebarContext';
import { useTheme } from '@/components/providers/ThemeProvider';

// ─── Icon components ──────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="0.75" />
      <rect x="8.5" y="1.5" width="5" height="5" rx="0.75" />
      <rect x="1.5" y="8.5" width="5" height="5" rx="0.75" />
      <rect x="8.5" y="8.5" width="5" height="5" rx="0.75" />
    </svg>
  );
}

function IconProvenance() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 1.5L2 4v4c0 3 2.5 5 5.5 5.5C10.5 13 13 11 13 8V4L7.5 1.5z" />
      <path d="M5 7.5l1.75 1.75L10 6" />
    </svg>
  );
}

function IconConflict() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 1.5L1.5 12.5h12L7.5 1.5z" />
      <line x1="7.5" y1="5.5" x2="7.5" y2="9" />
      <circle cx="7.5" cy="11" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconExceptions() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="1.5" width="9" height="12" rx="1" />
      <line x1="5.5" y1="5.5" x2="9.5" y2="5.5" />
      <line x1="5.5" y1="8" x2="9.5" y2="8" />
      <line x1="7.5" y1="10.5" x2="7.5" y2="13.5" />
      <line x1="6" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconAudit() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="1.5" width="9" height="12" rx="1" />
      <line x1="5.5" y1="4.5" x2="9.5" y2="4.5" />
      <line x1="5.5" y1="7" x2="9.5" y2="7" />
      <line x1="5.5" y1="9.5" x2="8" y2="9.5" />
    </svg>
  );
}

function IconMoralOS() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="5.5" />
      <ellipse cx="7.5" cy="7.5" rx="2" ry="1.25" />
      <line x1="7.5" y1="2" x2="7.5" y2="5.5" />
      <line x1="7.5" y1="9.5" x2="7.5" y2="13" />
    </svg>
  );
}

function IconExplainability() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 10.5A5.5 5.5 0 1 1 7.5 13H2.5l1-2.5z" />
      <circle cx="5.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="9.5" cy="7.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconGovernanceIntel() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="13" x2="2" y2="9" />
      <line x1="5.5" y1="13" x2="5.5" y2="7" />
      <line x1="9" y1="13" x2="9" y2="4" />
      <line x1="12.5" y1="13" x2="12.5" y2="2" />
      <line x1="1" y1="13" x2="13.5" y2="13" />
    </svg>
  );
}

function IconComplianceReports() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="1.5" width="9" height="12" rx="1" />
      <line x1="5.5" y1="4.5" x2="9.5" y2="4.5" />
      <line x1="5.5" y1="7" x2="9.5" y2="7" />
      <circle cx="7.5" cy="10.5" r="1.75" />
      <path d="M6.6 10.5l.65.65 1.3-1.3" />
    </svg>
  );
}

function IconAnomaly() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,8 3.5,8 5,5 7,11 9,4 10.5,8 13.5,8" />
    </svg>
  );
}

function IconIdentity() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="6" />
      <circle cx="7.5" cy="6" r="2" />
      <path d="M3.5 12.5a4.5 4.5 0 0 1 8 0" />
    </svg>
  );
}

function IconNHI() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5.5" r="2.5" />
      <line x1="7.5" y1="7.5" x2="13" y2="13" />
      <line x1="10" y1="11" x2="11.5" y2="9.5" />
      <line x1="11.5" y1="12.5" x2="13" y2="11" />
    </svg>
  );
}

function IconFinOps() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="6" />
      <path d="M7.5 4v1.25M7.5 9.75V11M5.75 6.25a1.75 1.75 0 0 1 3.5.25c0 1.75-3.5 1.75-3.5 3.5h3.5" />
    </svg>
  );
}

function IconDataResidency() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="6" />
      <line x1="1.5" y1="7.5" x2="13.5" y2="7.5" />
      <path d="M7.5 1.5C5.5 4 4.5 5.75 4.5 7.5s1 3.5 3 6" />
      <path d="M7.5 1.5C9.5 4 10.5 5.75 10.5 7.5s-1 3.5-3 6" />
    </svg>
  );
}

function IconA2A() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5h9.5M9 3l2.5 2L9 7" />
      <path d="M13 10H3.5M6 8l-2.5 2L6 12" />
    </svg>
  );
}

function IconRedTeam() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="5.5" />
      <circle cx="7.5" cy="7.5" r="2" />
      <line x1="7.5" y1="1" x2="7.5" y2="3.5" />
      <line x1="7.5" y1="11.5" x2="7.5" y2="14" />
      <line x1="1" y1="7.5" x2="3.5" y2="7.5" />
      <line x1="11.5" y1="7.5" x2="14" y2="7.5" />
    </svg>
  );
}

function IconPhysicalAI() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="8" height="8" rx="1" />
      <rect x="5.5" y="5.5" width="4" height="4" rx="0.5" />
      <line x1="3.5" y1="6" x2="1.5" y2="6" />
      <line x1="3.5" y1="9" x2="1.5" y2="9" />
      <line x1="11.5" y1="6" x2="13.5" y2="6" />
      <line x1="11.5" y1="9" x2="13.5" y2="9" />
      <line x1="6" y1="3.5" x2="6" y2="1.5" />
      <line x1="9" y1="3.5" x2="9" y2="1.5" />
      <line x1="6" y1="11.5" x2="6" y2="13.5" />
      <line x1="9" y1="11.5" x2="9" y2="13.5" />
    </svg>
  );
}

function IconIntegrations() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 2.5h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h0a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1H8.5" />
      <path d="M6.5 2.5h-2a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1h0a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h2" />
      <line x1="6.5" y1="7.5" x2="8.5" y2="7.5" />
    </svg>
  );
}

function IconBilling() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3.5" width="12" height="8" rx="1.25" />
      <line x1="1.5" y1="6.5" x2="13.5" y2="6.5" />
      <line x1="4" y1="9.5" x2="6" y2="9.5" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="2" />
      <path d="M7.5 1.5v1.25M7.5 12.25V13.5M1.5 7.5h1.25M12.25 7.5H13.5M3.4 3.4l.88.88M10.72 10.72l.88.88M3.4 11.6l.88-.88M10.72 4.28l.88-.88" />
    </svg>
  );
}

function IconFirewall() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 1.5L2 4v3.5c0 3.25 2.5 5.5 5.5 6C10.5 13 13 10.75 13 7.5V4L7.5 1.5z" />
      <line x1="5" y1="7.5" x2="10" y2="7.5" />
      <line x1="7.5" y1="5" x2="7.5" y2="10" />
    </svg>
  );
}

function IconControls() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="12" height="12" rx="1.5" />
      <line x1="4" y1="7.5" x2="6.5" y2="7.5" />
      <polyline points="6.5,5.5 9,7.5 6.5,9.5" />
      <line x1="9" y1="5" x2="9" y2="10" />
    </svg>
  );
}

function IconIncidents() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 1.5L1.5 12.5h12L7.5 1.5z" />
      <line x1="7.5" y1="6" x2="7.5" y2="9.5" />
      <circle cx="7.5" cy="11.25" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 11.5L5.5 7.5L9.5 3.5" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 3.5L9.5 7.5L5.5 11.5" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6.5" r="4" />
      <line x1="9.5" y1="9.5" x2="13" y2="13" />
    </svg>
  );
}

// ─── RuneSignal Logomark ──────────────────────────────────────────────────────

function RuneSignalLogo({ collapsed }: { collapsed: boolean }) {
  const { resolvedTheme } = useTheme();
  const logoSrc =
    resolvedTheme === 'light'
      ? '/runesignal_sourcelogo_v2_blue_whitebackgrnd.svg'
      : '/runesignal_sourcelogo_v2_white_darkbackgrnd.svg';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
        width: '100%',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt="RuneSignal"
        width={36}
        height={36}
        style={{
          borderRadius: 6,
          flexShrink: 0,
          display: 'block',
          objectFit: 'contain',
        }}
      />

      {!collapsed && (
        <span
          style={{
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em',
            whiteSpace: 'nowrap',
          }}
        >
          RuneSignal
        </span>
      )}
    </div>
  );
}

// ─── Nav item types ───────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

// ─── Nav structure ────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <IconDashboard /> },
      { label: 'Firewall', href: '/firewall', icon: <IconFirewall /> },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Provenance', href: '/provenance', icon: <IconProvenance /> },
      { label: 'Conflict Arbiter', href: '/conflict', icon: <IconConflict /> },
      { label: 'Incidents', href: '/incidents', icon: <IconIncidents /> },
      { label: 'Review Queue', href: '/exceptions', icon: <IconExceptions /> },
      { label: 'Audit Trail', href: '/audit', icon: <IconAudit /> },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Explainability', href: '/explain', icon: <IconExplainability /> },
      { label: 'Governance Intel', href: '/compliance', icon: <IconGovernanceIntel /> },
      { label: 'Compliance Reports', href: '/compliance/reports', icon: <IconComplianceReports /> },
      { label: 'Evidence Wizard', href: '/compliance/evidence', icon: <IconProvenance /> },
      { label: 'Controls', href: '/controls', icon: <IconControls /> },
      { label: 'Anomaly Detection', href: '/anomaly', icon: <IconAnomaly /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Agent Identity', href: '/identity', icon: <IconIdentity /> },
      { label: 'NHI Lifecycle', href: '/nhi', icon: <IconNHI /> },
      { label: 'FinOps', href: '/finops', icon: <IconFinOps /> },
      { label: 'Data Residency', href: '/sovereignty', icon: <IconDataResidency /> },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { label: 'A2A Gateway', href: '/a2a', icon: <IconA2A /> },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Integrations', href: '/account-settings/integrations', icon: <IconIntegrations /> },
      { label: 'Billing', href: '/billing', icon: <IconBilling /> },
      { label: 'Settings', href: '/account-settings/sso', icon: <IconSettings /> },
    ],
  },
];

// ─── NavItem component ────────────────────────────────────────────────────────

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function NavItemRow({ item, isActive, collapsed }: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  const isNew = item.badge === 'new';
  const isNumeric = typeof item.badge === 'number';

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: collapsed ? '0.5rem' : '0.4375rem 0.625rem',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        color: isActive ? 'var(--text-primary)' : hovered ? 'var(--text-secondary)' : 'var(--text-muted)',
        background: isActive
          ? 'var(--bg-surface-2)'
          : hovered
          ? 'rgba(255,255,255,0.03)'
          : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        paddingLeft: collapsed
          ? '0.5rem'
          : isActive
          ? 'calc(0.625rem - 2px)'
          : '0.625rem',
        transition:
          'background var(--t-fast), color var(--t-fast), border-color var(--t-fast)',
        justifyContent: collapsed ? 'center' : 'flex-start',
        position: 'relative',
        minHeight: 32,
      }}
    >
      {/* Icon */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: isActive ? 'var(--accent)' : 'inherit',
          transition: 'color var(--t-fast)',
        }}
      >
        {item.icon}
      </span>

      {/* Label + badge */}
      {!collapsed && (
        <>
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: isActive ? 500 : 400,
              flex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.label}
          </span>

          {isNumeric && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 9,
                background: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                color: 'var(--warning)',
                fontSize: '0.625rem',
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '0.02em',
                flexShrink: 0,
              }}
            >
              {item.badge}
            </span>
          )}

          {isNew && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1px 5px',
                borderRadius: 4,
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
                fontSize: '0.5625rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1.4,
                flexShrink: 0,
              }}
            >
              new
            </span>
          )}
        </>
      )}

      {/* Collapsed badge dot */}
      {collapsed && item.badge !== undefined && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isNew ? 'var(--accent)' : 'var(--warning)',
            border: '1.5px solid var(--bg-sidebar)',
          }}
        />
      )}
    </Link>
  );
}

// ─── Sidebar component ────────────────────────────────────────────────────────

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const [searchHovered, setSearchHovered] = useState(false);
  const [toggleHovered, setToggleHovered] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [reviewQueueCount, setReviewQueueCount] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<{ label: string; color: string; email: string | null } | null>(null);

  // Role resolution
  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setUserRole({ label: d.role_label, color: d.role_color, email: d.email });
      })
      .catch(() => {});
  }, []);

  // Live review queue badge
  useEffect(() => {
    async function fetchQueueCount() {
      try {
        const res = await fetch('/api/v1/exceptions');
        if (!res.ok) return;
        const data = await res.json();
        const open = Array.isArray(data) ? data.filter((t: any) => t.status === 'open').length : 0;
        setReviewQueueCount(open);
      } catch {
        // silently keep null
      }
    }
    fetchQueueCount();
    const iv = setInterval(fetchQueueCount, 60_000);
    return () => clearInterval(iv);
  }, []);

  // ⌘K handler
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Dispatch custom event that a command palette can listen for
        window.dispatchEvent(new CustomEvent('runesignal:cmdk'));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Determine active route — exact for '/', prefix match for others
  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  const sidebarWidth = collapsed ? 56 : 220;

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100vh',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.18s ease, min-width 0.18s ease',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* ── Logo area ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: collapsed ? '1rem 0.75rem' : '1rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          minHeight: 56,
          flexShrink: 0,
        }}
      >
        <RuneSignalLogo collapsed={collapsed} />
      </div>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div
        style={{
          padding: collapsed ? '0.625rem 0.75rem' : '0.625rem 0.75rem',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('runesignal:cmdk'))}
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
          title={collapsed ? 'Search (⌘K)' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: collapsed ? '0.4375rem' : '0.4375rem 0.625rem',
            borderRadius: 'var(--radius-md)',
            background: searchHovered
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.8125rem',
            transition: 'background var(--t-fast), border-color var(--t-fast)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <IconSearch />
          {!collapsed && (
            <>
              <span style={{ flex: 1, textAlign: 'left', color: 'var(--text-muted)' }}>
                Search…
              </span>
              <kbd
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.625rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                }}
              >
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* ── Nav sections ──────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          // Custom scrollbar
          scrollbarWidth: 'none',
        }}
      >
        {NAV_SECTIONS.map((section, si) => (
          <div
            key={si}
            style={{
              marginBottom: si < NAV_SECTIONS.length - 1 ? '0.25rem' : 0,
              paddingBottom: '0.25rem',
              borderBottom:
                si < NAV_SECTIONS.length - 1
                  ? '1px solid var(--border-subtle)'
                  : 'none',
            }}
          >
            {/* Section label */}
            {section.label && !collapsed && (
              <div
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '0.625rem 0.625rem 0.25rem',
                }}
              >
                {section.label}
              </div>
            )}
            {/* Collapsed: spacer in place of label */}
            {section.label && collapsed && (
              <div style={{ height: '0.5rem' }} />
            )}

            {/* Items */}
            {section.items.map((item) => {
              const dynamicItem =
                item.href === '/exceptions' && reviewQueueCount !== null
                  ? { ...item, badge: reviewQueueCount > 99 ? '99+' : reviewQueueCount }
                  : item;
              return (
                <NavItemRow
                  key={item.href}
                  item={dynamicItem}
                  isActive={isActive(item.href)}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User avatar + collapse toggle ─────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          flexShrink: 0,
        }}
      >
        {/* User / account link */}
        <Link
          href="/account-settings"
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
          title={collapsed ? 'Account' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: collapsed ? '0.4375rem' : '0.4375rem 0.5rem',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            background: avatarHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
            transition: 'background var(--t-fast)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '0.625rem',
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.02em',
            }}
          >
            {userRole?.email ? userRole.email.slice(0, 2).toUpperCase() : 'RS'}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userRole?.email ?? 'Account'}
              </div>
              {userRole && (
                <div style={{
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  color: userRole.color,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginTop: '0.0625rem',
                }}>
                  {userRole.label}
                </div>
              )}
            </div>
          )}
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          onMouseEnter={() => setToggleHovered(true)}
          onMouseLeave={() => setToggleHovered(false)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: collapsed ? '0.4375rem' : '0.4375rem 0.5rem',
            borderRadius: 'var(--radius-md)',
            background: toggleHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.75rem',
            transition: 'background var(--t-fast), color var(--t-fast)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 15,
              height: 15,
              flexShrink: 0,
            }}
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </span>
          {!collapsed && (
            <span style={{ color: 'var(--text-muted)' }}>Collapse</span>
          )}
        </button>
      </div>
    </aside>
  );
}

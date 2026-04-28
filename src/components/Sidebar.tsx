'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/SidebarContext';
import { NAV_SECTIONS } from '@/components/sidebar/nav-config';
import { NavItemRow } from '@/components/sidebar/NavItemRow';
import { SidebarFooter } from '@/components/sidebar/SidebarFooter';
import { SidebarLogo } from '@/components/sidebar/SidebarLogo';
import { IconSearch } from '@/components/sidebar/icons';

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const [searchHovered, setSearchHovered] = useState(false);
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
        window.dispatchEvent(new CustomEvent('runesignal:cmdk'));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      {/* Logo */}
      <div style={{ padding: collapsed ? '1rem 0.75rem' : '1rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', minHeight: 56, flexShrink: 0 }}>
        <SidebarLogo collapsed={collapsed} />
      </div>

      {/* Search */}
      <div style={{ padding: '0.625rem 0.75rem', flexShrink: 0 }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('runesignal:cmdk'))}
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
          title={collapsed ? 'Search (⌘K)' : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: collapsed ? '0.4375rem' : '0.4375rem 0.625rem', borderRadius: 'var(--radius-md)', background: searchHovered ? 'var(--hover-wash)' : 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8125rem', transition: 'background var(--t-fast), border-color var(--t-fast)', justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          <IconSearch />
          {!collapsed && (
            <>
              <span style={{ flex: 1, textAlign: 'left', color: 'var(--text-tertiary)' }}>Search…</span>
              <kbd style={{ display: 'inline-flex', alignItems: 'center', gap: 1, padding: '1px 4px', borderRadius: 3, background: 'var(--surface-3)', border: '1px solid var(--border-default)', fontSize: '0.625rem', color: 'var(--text-tertiary)', fontFamily: 'inherit', lineHeight: 1.6 }}>⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: 0, scrollbarWidth: 'none' }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: si < NAV_SECTIONS.length - 1 ? '0.25rem' : 0, paddingBottom: '0.25rem', borderBottom: si < NAV_SECTIONS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            {section.label && !collapsed && (
              <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.625rem 0.25rem' }}>
                {section.label}
              </div>
            )}
            {section.label && collapsed && <div style={{ height: '0.5rem' }} />}
            {section.items.map((item) => {
              const dynamicItem =
                item.href === '/exceptions' && reviewQueueCount !== null
                  ? { ...item, badge: reviewQueueCount > 99 ? '99+' : reviewQueueCount }
                  : item;
              return (
                <NavItemRow key={item.href} item={dynamicItem} isActive={isActive(item.href)} collapsed={collapsed} />
              );
            })}
          </div>
        ))}
      </nav>

      <SidebarFooter collapsed={collapsed} toggle={toggle} userRole={userRole} />
    </aside>
  );
}


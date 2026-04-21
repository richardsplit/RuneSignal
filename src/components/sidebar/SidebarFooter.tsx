'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { IconChevronLeft, IconChevronRight } from './icons';

interface SidebarFooterProps {
  collapsed: boolean;
  toggle: () => void;
  userRole: { label: string; color: string; email: string | null } | null;
}

export function SidebarFooter({ collapsed, toggle, userRole }: SidebarFooterProps) {
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [toggleHovered, setToggleHovered] = useState(false);

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
      <Link
        href="/account-settings"
        onMouseEnter={() => setAvatarHovered(true)}
        onMouseLeave={() => setAvatarHovered(false)}
        title={collapsed ? 'Account' : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: collapsed ? '0.4375rem' : '0.4375rem 0.5rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', background: avatarHovered ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'background var(--t-fast)', justifyContent: collapsed ? 'center' : 'flex-start' }}
      >
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.02em' }}>
          {userRole?.email ? userRole.email.slice(0, 2).toUpperCase() : 'RS'}
        </div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userRole?.email ?? 'Account'}
            </div>
            {userRole && (
              <div style={{ fontSize: '0.6rem', fontWeight: 600, color: userRole.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '0.0625rem' }}>
                {userRole.label}
              </div>
            )}
          </div>
        )}
      </Link>

      <button
        onClick={toggle}
        onMouseEnter={() => setToggleHovered(true)}
        onMouseLeave={() => setToggleHovered(false)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: collapsed ? '0.4375rem' : '0.4375rem 0.5rem', borderRadius: 'var(--radius-md)', background: toggleHovered ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', transition: 'background var(--t-fast), color var(--t-fast)', justifyContent: collapsed ? 'center' : 'flex-start', width: '100%' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, flexShrink: 0 }}>
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </span>
        {!collapsed && <span style={{ color: 'var(--text-muted)' }}>Collapse</span>}
      </button>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { NavItem } from './nav-config';

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

export function NavItemRow({ item, isActive, collapsed }: NavItemProps) {
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
        background: isActive ? 'var(--bg-surface-2)' : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        paddingLeft: collapsed ? '0.5rem' : isActive ? 'calc(0.625rem - 2px)' : '0.625rem',
        transition: 'background var(--t-fast), color var(--t-fast), border-color var(--t-fast)',
        justifyContent: collapsed ? 'center' : 'flex-start',
        position: 'relative',
        minHeight: 32,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isActive ? 'var(--accent)' : 'inherit', transition: 'color var(--t-fast)' }}>
        {item.icon}
      </span>

      {!collapsed && (
        <>
          <span style={{ fontSize: '0.8125rem', fontWeight: isActive ? 500 : 400, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.label}
          </span>
          {isNumeric && (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning)', fontSize: '0.625rem', fontWeight: 700, lineHeight: 1, letterSpacing: '0.02em', flexShrink: 0 }}>
              {item.badge}
            </span>
          )}
          {isNew && (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '1px 5px', borderRadius: 4, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.4, flexShrink: 0 }}>
              new
            </span>
          )}
        </>
      )}

      {collapsed && item.badge !== undefined && (
        <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: isNew ? 'var(--accent)' : 'var(--warning)', border: '1.5px solid var(--bg-sidebar)' }} />
      )}
    </Link>
  );
}

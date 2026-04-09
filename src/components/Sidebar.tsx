'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  
  const navItems = [
    // Core
    { name: 'Overview', href: '/dashboard', group: 'Core' },
    { name: '🛡️ Action Firewall', href: '/firewall', group: 'Core' },
    { name: 'S3 Provenance', href: '/provenance', group: 'Core' },
    { name: 'S6 Identity', href: '/identity', group: 'Core' },
    { name: 'S1 Conflict', href: '/conflict', group: 'Core' },
    { name: 'S7 Exceptions', href: '/exceptions', group: 'Core' },
    { name: 'S5 Insurance', href: '/insurance', group: 'Core' },
    { name: 'S8 MoralOS', href: '/moral', group: 'Core' },
    // Intelligence & Compliance
    { name: 'S11 Explainability', href: '/explain', group: 'Intel' },
    { name: 'S13 Governance', href: '/compliance', group: 'Intel' },
    { name: '📋 Compliance Reports', href: '/compliance/reports', group: 'Intel' },
    { name: 'S14 Anomaly Detector', href: '/anomaly', group: 'Intel' },
    // Operations
    { name: 'S9 FinOps', href: '/finops', group: 'Ops' },
    { name: '📊 Risk Analytics', href: '/insurance/analytics', group: 'Ops' },
    { name: 'S10 Data Residency', href: '/sovereignty', group: 'Ops' },
    { name: 'S12 NHI Lifecycle', href: '/nhi', group: 'Ops' },
    // Advanced
    { name: 'S15 Physical AI', href: '/physical', group: 'Advanced' },
    { name: 'S16 A2A Gateway', href: '/a2a', group: 'Advanced' },
    { name: 'S17 Red Teaming', href: '/red-team', group: 'Advanced' },
    // Platform
    { name: 'API Documentation', href: '/documentation', group: 'Platform' },
    { name: '🚀 Quickstart', href: '/documentation/quickstart', group: 'Platform' },
    { name: 'Billing & Usage', href: '/billing', group: 'Platform' },
    { name: 'SSO Settings', href: '/account-settings/sso', group: 'Platform' },
    { name: 'Integrations', href: '/account-settings/integrations', group: 'Platform' },
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'var(--color-bg-surface)',
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 0'
    }}>
      {/* Brand */}
      <div style={{ padding: '0 1.5rem', marginBottom: '3rem' }}>
        <Link href="/dashboard">
          <Image
            src="/trustlayer-logo.svg"
            alt="TrustLayer"
            width={200}
            height={50}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 1rem', overflowY: 'auto' }}>
        {(['Core', 'Intel', 'Ops', 'Advanced', 'Platform'] as const).map(group => {
          const items = navItems.filter(i => i.group === group);
          return (
            <div key={group} style={{ marginBottom: '1.25rem' }}>
              <div style={{ padding: '0 0.5rem 0.4rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', opacity: 0.5 }}>
                {group === 'Intel' ? 'Intelligence' : group}
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {items.map(item => {
                  const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/dashboard');
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.6rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          color: isActive ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          fontWeight: isActive ? 600 : 400,
                          transition: 'all 0.2s',
                          background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                          border: isActive ? '1px solid var(--border-glass)' : '1px solid transparent'
                        }}
                        className={!isActive ? "hover-highlight" : ""}
                      >
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div style={{ padding: '0 1.5rem', marginTop: 'auto' }}>
        <div className="glass-panel" style={{ padding: '1rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary-emerald)' }}></div>
            <span style={{ color: 'var(--color-primary-emerald)', fontWeight: 600 }}>System Healthy</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)' }}>TrustLayer Edge v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}

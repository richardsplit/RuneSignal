import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Sidebar() {
  const navItems = [
    { name: 'Overview', href: '/' },
    { name: 'S3 Provenance', href: '/provenance' },
    { name: 'S6 Identity', href: '/identity' },
    { name: 'S1 Conflict', href: '/conflict' },
    { name: 'S7 Exeptions', href: '/exceptions' },
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
        <Link href="/">
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
      <nav style={{ flex: 1, padding: '0 1rem' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map(item => (
            <li key={item.name}>
              <Link 
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-muted)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  background: item.name === 'Overview' ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
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

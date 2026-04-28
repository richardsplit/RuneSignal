'use client';

import Link from 'next/link';

const NAV = [
  {
    section: 'Getting Started',
    items: [
      { label: 'Quickstart', href: '/documentation/quickstart' },
      { label: 'API Reference', href: '/documentation' },
    ],
  },
  {
    section: 'Core APIs',
    items: [
      { label: 'Firewall Evaluate', href: '/documentation#/Firewall' },
      { label: 'Agent Registration', href: '/documentation#/Agents' },
      { label: 'HITL Exceptions', href: '/documentation#/Exceptions' },
      { label: 'Provenance Certs', href: '/documentation#/Provenance' },
    ],
  },
  {
    section: 'Governance',
    items: [
      { label: 'Policy Engine', href: '/documentation#/Policy' },
      { label: 'Moral Alignment', href: '/documentation#/Moral' },
      { label: 'Risk Scoring', href: '/documentation#/Risk' },
      { label: 'Policy Packs', href: '/documentation#/PolicyPacks' },
    ],
  },
  {
    section: 'Enterprise',
    items: [
      { label: 'SIEM Export', href: '/documentation#/SIEM' },
      { label: 'Compliance Reports', href: '/documentation#/Compliance' },
      { label: 'SSO Configuration', href: '/account-settings/sso' },
    ],
  },
  {
    section: 'SDKs',
    items: [
      {
        label: 'Node.js SDK',
        href: 'https://www.npmjs.com/package/@runesignal/sdk',
        external: true,
      },
      {
        label: 'Python SDK',
        href: 'https://pypi.org/project/runesignal',
        external: true,
      },
    ],
  },
];

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid var(--border-subtle)',
          padding: '24px 0',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            padding: '0 16px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', letterSpacing: 1 }}>
            RUNESIGNAL
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Developer Docs
          </div>
        </div>

        {NAV.map(group => (
          <div key={group.section} style={{ padding: '4px 0 12px' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: 'var(--text-tertiary)',
                padding: '0 16px 6px',
              }}
            >
              {group.section}
            </div>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                target={(item as any).external ? '_blank' : undefined}
                rel={(item as any).external ? 'noopener noreferrer' : undefined}
                style={{
                  display: 'block',
                  padding: '5px 16px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  borderRadius: 0,
                  transition: 'color var(--t-fast)',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                }}
              >
                {item.label}
                {(item as any).external && (
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: 4, fontSize: 10 }}>↗</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
    </div>
  );
}

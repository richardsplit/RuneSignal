'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/ci',           label: 'Customer Margins',  icon: '📊' },
  { href: '/ci/models',    label: 'AI Spend by Model', icon: '🤖' },
  { href: '/ci/trends',    label: 'Monthly Trends',    icon: '📈' },
  { href: '/ci/features',  label: 'Features',          icon: '🏷️' },
  { href: '/ci/alerts',    label: 'Anomalies',         icon: '⚡' },
  { href: '/ci/policies',  label: 'Guardrails',        icon: '🛡️' },
  { href: '/ci/settings',  label: 'Connections',       icon: '⚙️' },
];

export default function CiLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#e2e8f0' }}>
      {/* Top bar */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', gap: '2rem', height: 56,
        background: '#0d1117',
      }}>
        <Link href="/ci" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#e2e8f0' }}>RuneSignal</span>
          <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)',
            color: '#818cf8', borderRadius: '2rem', padding: '0.15rem 0.5rem', fontWeight: 700 }}>
            Cost Intelligence
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
          {NAV.map(n => {
            const active = n.href === '/ci' ? path === '/ci' : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} style={{
                padding: '0.35rem 0.875rem', borderRadius: '0.4rem', textDecoration: 'none',
                fontSize: '0.83rem', fontWeight: active ? 600 : 400,
                background: active ? 'rgba(99,102,241,.12)' : 'transparent',
                color: active ? '#a5b4fc' : '#475569',
                border: active ? '1px solid rgba(99,102,241,.2)' : '1px solid transparent',
              }}>
                {n.icon} {n.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/dashboard" style={{ fontSize: '0.78rem', color: '#334155', textDecoration: 'none' }}>
          ← Back to RuneSignal
        </Link>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
}

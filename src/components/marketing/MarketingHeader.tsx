'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Wordmark } from '@/components/marketing/Wordmark';

/**
 * MarketingHeader — sticky, translucent, token-driven header for the
 * public marketing shell. Becomes condensed + bordered on scroll.
 */
export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="marketing-header"
      role="banner"
    >
      <div className="marketing-header-inner">
        <Link href="/" className="marketing-logo" aria-label="RuneSignal — home">
          <Wordmark />
        </Link>

        <nav className="marketing-nav" aria-label="Primary">
          <Link href="/#product" className="marketing-nav-link">Product</Link>
          <Link href="/#how-it-works" className="marketing-nav-link">How it works</Link>
          <Link href="/pricing" className="marketing-nav-link">Pricing</Link>
          <Link href="/security" className="marketing-nav-link">Security</Link>
        </nav>

        <div className="marketing-actions">
          <ThemeToggle variant="icon" />
          <Link href="/login" className="marketing-nav-link marketing-signin">
            Sign in
          </Link>
          <Link href="/login?mode=signup" className="btn btn-primary btn-sm">
            Get started
          </Link>
          <button
            type="button"
            className="btn btn-icon btn-ghost marketing-menu"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M2 5h14M2 9h14M2 13h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="marketing-mobile-panel" role="menu">
          <Link href="/#product" className="marketing-mobile-link" onClick={() => setMobileOpen(false)}>Product</Link>
          <Link href="/#how-it-works" className="marketing-mobile-link" onClick={() => setMobileOpen(false)}>How it works</Link>
          <Link href="/pricing" className="marketing-mobile-link" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link href="/security" className="marketing-mobile-link" onClick={() => setMobileOpen(false)}>Security</Link>
          <Link href="/login" className="marketing-mobile-link" onClick={() => setMobileOpen(false)}>Sign in</Link>
          <Link
            href="/login?mode=signup"
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => setMobileOpen(false)}
          >
            Get started
          </Link>
        </div>
      )}
    </header>
  );
}

export default MarketingHeader;

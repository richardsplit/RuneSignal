import Link from 'next/link';
import { Wordmark } from '@/components/marketing/Wordmark';

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="marketing-footer" role="contentinfo">
      <div className="marketing-footer-inner">
        <div className="marketing-footer-brand">
          <Wordmark />
          <p className="t-body-sm" style={{ color: 'var(--text-tertiary)', maxWidth: 320, marginTop: 12 }}>
            Governance, accountability, and operational control for AI agent
            fleets in production.
          </p>
        </div>

        <div className="marketing-footer-columns">
          <div className="marketing-footer-col">
            <div className="t-eyebrow">Product</div>
            <Link href="/#product">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/security">Security</Link>
          </div>
          <div className="marketing-footer-col">
            <div className="t-eyebrow">Company</div>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/dpa">DPA</Link>
          </div>
          <div className="marketing-footer-col">
            <div className="t-eyebrow">Get started</div>
            <Link href="/login">Sign in</Link>
            <Link href="/login?mode=signup">Create account</Link>
          </div>
        </div>
      </div>

      <div className="marketing-footer-bottom">
        <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
          © {year} RuneSignal. All rights reserved.
        </span>
        <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
          Built for enterprise AI governance.
        </span>
      </div>
    </footer>
  );
}

export default MarketingFooter;

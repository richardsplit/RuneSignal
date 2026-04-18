import MarketingHeader from '@/components/marketing/MarketingHeader';
import MarketingFooter from '@/components/marketing/MarketingFooter';

/**
 * Public marketing shell — standalone header + footer, completely
 * separate from the authenticated app chrome. Pages inside this group
 * (`/`, `/pricing`, `/security`, `/legal/*`) render outside the app.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-layout">
      <MarketingHeader />
      <main id="main">{children}</main>
      <MarketingFooter />
    </div>
  );
}

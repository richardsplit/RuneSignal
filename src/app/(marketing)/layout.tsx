/**
 * Public marketing shell.
 *
 * Intentionally minimal — a full marketing header + footer will be added
 * in the design-system commit. For now this is a passthrough so pages
 * like /, /pricing, /security, /legal/* render outside the app chrome.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="marketing-layout">{children}</div>;
}

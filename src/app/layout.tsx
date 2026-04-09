'use client';

import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/components/ToastProvider';
import { TenantProvider } from '@lib/contexts/TenantContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/onboarding' || pathname === '/landing' || pathname === '/mfa-verify' || pathname.startsWith('/landing');

  return (
    <html lang="en">
      <head>
        <title>TrustLayer | Enterprise AI Governance</title>
        <meta name="description" content="Provide governance, accountability, and operational control over AI agent fleets in production." />
      </head>
      <body>
        <ToastProvider>
          <TenantProvider>
            {isAuthPage ? (
              <main style={{ minHeight: '100vh' }}>
                {children}
              </main>
            ) : (
              <div className="app-layout">
                <Sidebar />
                <div className="main-content">
                  <Header />
                  <main className="animate-fade-in" style={{ flex: 1, marginTop: '2rem' }}>
                    {children}
                  </main>
                </div>
              </div>
            )}
          </TenantProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

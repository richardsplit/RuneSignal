import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'TrustLayer | Enterprise AI Governance',
  description: 'Provide governance, accountability, and operational control over AI agent fleets in production.',
};

import { ToastProvider } from '@/components/ToastProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <Header />
              <main className="animate-fade-in" style={{ flex: 1, marginTop: '2rem' }}>
                {children}
              </main>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}

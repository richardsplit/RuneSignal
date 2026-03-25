import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'TrustLayer | Enterprise AI Governance',
  description: 'Provide governance, accountability, and operational control over AI agent fleets in production.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <Header />
            <main className="animate-fade-in" style={{ flex: 1, marginTop: '2rem' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

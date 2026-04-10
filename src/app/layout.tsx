import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { ToastProvider } from '@/components/ToastProvider';
import CommandPalette from '@/components/CommandPalette';
import { SidebarProvider } from '@/components/SidebarContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  axes: ['opsz'],
});

export const metadata: Metadata = {
  title: 'TrustLayer | Enterprise AI Governance',
  description: 'Governance, accountability, and operational control for AI agent fleets in production.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ToastProvider>
          <SidebarProvider>
            <CommandPalette />
            <div className="app-layout">
              <Sidebar />
              <div className="main-content">
                <Header />
                <main className="animate-fade-in" style={{ flex: 1, padding: '2rem', minWidth: 0 }}>
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

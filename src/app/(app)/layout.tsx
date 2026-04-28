import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import CommandPalette from '@/components/CommandPalette';
import { SidebarProvider } from '@/components/SidebarContext';
import { TenantProvider } from '@lib/contexts/TenantContext';

/**
 * Authenticated app shell.
 *
 * Hosts the sidebar, topbar, command palette, and tenant context.
 * Public (marketing / auth) routes deliberately do NOT pass through here.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <SidebarProvider>
        <CommandPalette />
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <Header />
            <main
              className="animate-fade-in"
              style={{ flex: 1, padding: 'var(--space-8) var(--space-8) var(--space-16)', minWidth: 0 }}
            >
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TenantProvider>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';
import { ThemeProvider, themeNoFlashScript } from '@/components/providers/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'RuneSignal | Enterprise AI Governance',
  description:
    'Governance, accountability, and operational control for AI agent fleets in production.',
};

/**
 * Shell-free root layout.
 *
 * This layout intentionally does NOT render the sidebar, topbar, or any
 * dashboard chrome. Route groups under `src/app/` handle their own shells:
 *
 *   (app)/         → authenticated app shell (sidebar + topbar)
 *   (marketing)/   → public marketing shell (standalone header + footer)
 *   (auth)/        → login / onboarding / mfa-verify (centered card)
 *
 * Keeping the root bare is what prevents the landing page from appearing
 * to "pop up from inside the dashboard".
 *
 * The inline theme script runs before hydration to apply the stored
 * preference to <html data-theme>, preventing a dark/light flash on load.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          // Intentional: the script is a static, self-contained string that
          // must run before React hydrates to prevent a theme flash.
          dangerouslySetInnerHTML={{ __html: themeNoFlashScript }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

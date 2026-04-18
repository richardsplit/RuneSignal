'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * ThemeProvider
 *
 * Dual-theme (dark/light) system with three user-selectable modes:
 *   - "dark"    → always dark
 *   - "light"   → always light
 *   - "system"  → follow OS `prefers-color-scheme`
 *
 * The resolved theme is written to `document.documentElement[data-theme]`,
 * which globals.css keys off of for both theme tokens and the
 * `color-scheme` property.
 *
 * A no-flash inline script in the root layout (see `app/layout.tsx`) applies
 * the stored preference BEFORE React hydrates, so the initial paint never
 * flashes the wrong theme.
 *
 * During an explicit user switch we briefly add `.theme-transition-disabled`
 * on <html> so mid-flight transitions don't produce a half-animated flicker.
 */

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  /** User preference (may be "system"). */
  theme: ThemeMode;
  /** Actually applied theme after resolving "system". */
  resolvedTheme: ResolvedTheme;
  /** Update preference; persists to localStorage. */
  setTheme: (next: ThemeMode) => void;
  /** Quick toggle between dark ↔ light (ignores "system"). */
  toggleTheme: () => void;
}

const STORAGE_KEY = 'runesignal:theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
  } catch {
    /* ignore */
  }
  return 'dark';
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initial state is "dark" for SSR; the no-flash script + effect below
  // reconcile to the real stored preference on mount.
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const transitionTimer = useRef<number | null>(null);

  // Hydrate from storage on first client render.
  useEffect(() => {
    const stored = readStoredTheme();
    const next = resolve(stored);
    setThemeState(stored);
    setResolvedTheme(next);
    applyTheme(next);
  }, []);

  // Follow system changes when in "system" mode.
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      const next: ResolvedTheme = mql.matches ? 'light' : 'dark';
      setResolvedTheme(next);
      applyTheme(next);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }

    const resolved = resolve(next);

    // Suppress transitions for the switch itself.
    const root = document.documentElement;
    root.classList.add('theme-transition-disabled');
    if (transitionTimer.current) window.clearTimeout(transitionTimer.current);

    setThemeState(next);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    transitionTimer.current = window.setTimeout(() => {
      root.classList.remove('theme-transition-disabled');
      transitionTimer.current = null;
    }, 60);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within <ThemeProvider>.');
  }
  return ctx;
}

/**
 * Raw no-flash script content. Embedded as a string inside a <script> tag
 * in the root layout so it runs before React hydrates.
 *
 * Keep this self-contained (no imports, no template literals referencing
 * outside scope) — it's serialized as-is.
 */
export const themeNoFlashScript = `
(function() {
  try {
    var key = 'runesignal:theme';
    var stored = localStorage.getItem(key);
    var mode = (stored === 'dark' || stored === 'light' || stored === 'system') ? stored : 'dark';
    var resolved = mode;
    if (mode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch (_) {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`.trim();

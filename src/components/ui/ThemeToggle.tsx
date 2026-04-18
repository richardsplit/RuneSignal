'use client';

import { useTheme, type ThemeMode } from '@/components/providers/ThemeProvider';

/**
 * ThemeToggle
 *
 * Apple-style segmented control for Dark / System / Light.
 * Uses the `.segmented` classes defined in globals.css.
 *
 * Variants:
 *   - "segmented" (default) — full three-option picker, ideal for Settings
 *   - "icon"                — single icon button that flips between dark ↔ light,
 *                             ideal for a topbar / marketing header
 */

interface ThemeToggleProps {
  variant?: 'segmented' | 'icon';
  className?: string;
}

const OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'system', label: 'System', icon: <SystemIcon /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
];

export function ThemeToggle({ variant = 'segmented', className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`btn btn-icon btn-ghost ${className ?? ''}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`segmented ${className ?? ''}`}
    >
      {OPTIONS.map((opt) => {
        const selected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-selected={selected || undefined}
            className="segmented-item"
            onClick={() => setTheme(opt.value)}
          >
            <span className="segmented-icon" aria-hidden="true">
              {opt.icon}
            </span>
            <span className="segmented-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline icons — stroked, 16px, currentColor                          */
/* ------------------------------------------------------------------ */

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.3 3.3l1.05 1.05M11.65 11.65l1.05 1.05M3.3 12.7l1.05-1.05M11.65 4.35l1.05-1.05"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a.5.5 0 0 0-.7-.46A6.5 6.5 0 1 0 13.96 10.2a.5.5 0 0 0-.46-.7z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="3"
        width="12"
        height="8.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6 14h4M8 11.5V14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default ThemeToggle;

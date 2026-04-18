import * as React from 'react';

/**
 * RuneSignal wordmark — a minimal rune glyph + typeset name.
 * Uses currentColor / accent so it works across both themes.
 */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="wordmark">
      <RuneGlyph size={size} />
      <span className="wordmark-text">RuneSignal</span>
    </span>
  );
}

export function RuneGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="rune-glyph"
    >
      <line x1="14" y1="3" x2="14" y2="25" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="14" y1="9" x2="6" y2="4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="14" y1="9" x2="22" y2="4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="14" y1="17" x2="6" y2="23" stroke="var(--accent, currentColor)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="14" y1="17" x2="22" y2="23" stroke="var(--accent, currentColor)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default Wordmark;

'use client';

import * as React from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

/**
 * RuneSignal wordmark — actual brand logo mark + typeset name.
 * Switches between white-on-dark and blue-on-white SVGs based on resolved theme.
 */
export function Wordmark({ size = 40 }: { size?: number }) {
  const { resolvedTheme } = useTheme();
  return (
    <span className="wordmark">
      <LogoMark size={size} resolvedTheme={resolvedTheme} />
      <span className="wordmark-text">RuneSignal</span>
    </span>
  );
}

export function LogoMark({
  size = 28,
  resolvedTheme,
}: {
  size?: number;
  resolvedTheme?: 'dark' | 'light';
}) {
  const src =
    resolvedTheme === 'light'
      ? '/runesignal_sourcelogo_v2_blue_whitebackgrnd.svg'
      : '/runesignal_sourcelogo_v2_white_darkbackgrnd.svg';

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="RuneSignal logo mark"
      width={size}
      height={size}
      style={{
        borderRadius: 'var(--radius-sm)',
        flexShrink: 0,
        display: 'block',
        objectFit: 'contain',
      }}
    />
  );
}

export default Wordmark;

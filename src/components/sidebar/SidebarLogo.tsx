'use client';

import React from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

export function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  const { resolvedTheme } = useTheme();
  const logoSrc =
    resolvedTheme === 'light'
      ? '/runesignal_sourcelogo_v2_blue_whitebackgrnd.svg'
      : '/runesignal_sourcelogo_v2_white_darkbackgrnd.svg';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', justifyContent: collapsed ? 'center' : 'flex-start', width: '100%' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="RuneSignal" width={36} height={36} style={{ borderRadius: 6, flexShrink: 0, display: 'block', objectFit: 'contain' }} />
      {!collapsed && (
        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
          RuneSignal
        </span>
      )}
    </div>
  );
}

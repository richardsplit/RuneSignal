'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
}

const Ctx = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Persist preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tl-sidebar-collapsed');
      if (stored === 'true') setCollapsed(true);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('tl-sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}

export function useSidebar() {
  return useContext(Ctx);
}

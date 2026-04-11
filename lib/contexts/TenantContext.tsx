'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@lib/db/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { setSessionTenantId } from '@/lib/api';

interface TenantContextType {
  tenantId: string | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchTenant = async () => {
      // Don't fetch for public pages
      if (pathname === '/login' || pathname === '/onboarding') {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: membership, error: memError } = await supabase
          .from('tenant_members')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (memError || !membership) {
          // User has no tenant, middleware should redirect, but we'll be safe
          setLoading(false);
          return;
        }

        setTenantId(membership.tenant_id);
        setSessionTenantId(membership.tenant_id);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [supabase, pathname]);

  return (
    <TenantContext.Provider value={{ tenantId, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

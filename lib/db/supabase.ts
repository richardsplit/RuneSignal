import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSsrServerClient, createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for trusted backend operations (bypasses RLS). 
export function createAdminClient() {
  if (!supabaseUrl || !serviceKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing Supabase Admin environment variables (URL or SERVICE_ROLE_KEY)');
    }
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

// Client for static/public operations (respects RLS).
export function createAnonClient() {
  if (!supabaseUrl || !anonKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing Supabase Anonymous environment variables (URL or ANON_KEY)');
    }
  }
  return createClient(supabaseUrl, anonKey);
}

// SSR Client for Server Components and Server Actions
export async function createServerClient() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  
  return createSsrServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

// Client for Browser Components
export function createBrowserClient() {
  return createSsrBrowserClient(supabaseUrl, anonKey);
}

// Middleware Client for auth verification
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createSsrServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );
}

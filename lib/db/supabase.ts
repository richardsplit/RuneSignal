import { createClient } from '@supabase/supabase-js';

// Client for trusted backend operations (bypasses RLS). 
// Use this ONLY in server-side API routes and server actions.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase Admin environment variables (URL or SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}

// Client for anonymous/public operations (respects RLS).
export function createAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Missing Supabase Anonymous environment variables (URL or ANON_KEY)');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

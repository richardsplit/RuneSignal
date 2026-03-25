import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

// Client for trusted backend operations (bypasses RLS). 
// Use this ONLY in server-side API routes and server actions.
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}

// Client for anonymous/public operations (respects RLS).
export function createAnonClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

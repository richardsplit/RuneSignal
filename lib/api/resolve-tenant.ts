/**
 * Shared tenant-ID resolver for API route handlers.
 *
 * Resolves the calling tenant from:
 *   1. Bearer API key (hashed lookup in api_keys table)
 *   2. X-Tenant-Id / x-tenant-id header (set by middleware for authenticated sessions)
 *
 * Returns null when neither source is available.
 */

import { NextRequest } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import crypto from 'crypto';

export async function resolveTenantId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (apiKey) {
    try {
      const supabase = createAdminClient();
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const { data } = await supabase
        .from('api_keys')
        .select('tenant_id')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single();
      if (data?.tenant_id) return String(data.tenant_id);
    } catch {
      // invalid / unknown key — fall through to header
    }
  }

  return req.headers.get('x-tenant-id') ?? req.headers.get('X-Tenant-Id') ?? null;
}

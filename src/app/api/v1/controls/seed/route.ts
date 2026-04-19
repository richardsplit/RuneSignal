/**
 * POST /api/v1/controls/seed — Seed default compliance controls
 *
 * Convenience endpoint for initial setup. Creates default control
 * templates for the tenant.
 *
 * EU AI Act Article 9 — Compliance monitoring controls
 * Phase 4 Task 4.2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { ControlService } from '@lib/services/control-service';
import crypto from 'crypto';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  if (apiKey) {
    const supabase = createAdminClient();
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('tenant_id')
      .eq('key_hash', crypto.createHash('sha256').update(apiKey).digest('hex'))
      .single()
      .catch(() => ({ data: null }));

    if (keyData?.tenant_id) return keyData.tenant_id;
  }

  const headerTenantId = req.headers.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const { seeded, skipped } = await ControlService.seedDefaults(tenantId);

    return NextResponse.json({ seeded, skipped, total: seeded + skipped }, { status: 201 });
  } catch (err) {
    console.error('[controls/seed POST] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

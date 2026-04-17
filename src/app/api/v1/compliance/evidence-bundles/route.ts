/**
 * GET /api/v1/compliance/evidence-bundles
 *
 * List evidence bundles for the current tenant.
 * Query params: ?regulation=eu_ai_act&limit=10&offset=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { EvidenceService } from '@lib/services/evidence-service';
import type { Regulation } from '@lib/types/evidence-bundle';
import crypto from 'crypto';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  const apiKey = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  if (apiKey) {
    const supabase = createAdminClient();
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('tenant_id')
      .eq('key_hash', keyHash)
      .single()
      .catch(() => ({ data: null }));

    if (keyData?.tenant_id) return keyData.tenant_id;
  }

  const headerTenantId = req.headers.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const url = req.nextUrl;
    const regulation = url.searchParams.get('regulation') as Regulation | null;
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const validRegulations: Regulation[] = ['eu_ai_act', 'iso_42001'];
    if (regulation && !validRegulations.includes(regulation)) {
      return NextResponse.json(
        { error: `Invalid regulation. Must be one of: ${validRegulations.join(', ')}` },
        { status: 400 },
      );
    }

    const result = await EvidenceService.list(tenantId, {
      regulation: regulation || undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[compliance/evidence-bundles] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

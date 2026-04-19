/**
 * GET /api/v1/compliance/evidence-bundles
 *
 * List evidence bundles for the current tenant.
 * Query params: ?regulation=eu_ai_act&limit=10&offset=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { EvidenceService } from '@lib/services/evidence-service';
import type { Regulation } from '@lib/types/evidence-bundle';
import { resolveTenantId } from '@lib/api/resolve-tenant';

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

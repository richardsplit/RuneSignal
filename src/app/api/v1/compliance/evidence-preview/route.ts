/**
 * GET /api/v1/compliance/evidence-preview
 *
 * Dry-run coverage computation for the Evidence Wizard Step 4 live preview.
 * Generates the regulation report and returns coverage WITHOUT persisting.
 *
 * Query params:
 *   regulation=eu_ai_act|iso_42001
 *   start=ISO_DATE
 *   end=ISO_DATE
 */

import { NextRequest, NextResponse } from 'next/server';
import { EvidenceService } from '@lib/services/evidence-service';
import type { Regulation } from '@lib/types/evidence-bundle';

const VALID_REGULATIONS: Regulation[] = ['eu_ai_act', 'iso_42001'];

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const regulation = searchParams.get('regulation') as Regulation | null;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!regulation || !VALID_REGULATIONS.includes(regulation)) {
      return NextResponse.json(
        { error: `regulation must be one of: ${VALID_REGULATIONS.join(', ')}` },
        { status: 400 },
      );
    }
    if (!start || !end) {
      return NextResponse.json({ error: 'start and end query params are required' }, { status: 400 });
    }

    const preview = await EvidenceService.preview({
      tenant_id: tenantId,
      regulation,
      period: { start, end },
    });

    return NextResponse.json(preview);
  } catch (err) {
    console.error('[evidence-preview] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/v1/compliance/regulations
 *
 * Returns all supported regulations with their clauses from the
 * regulation_clauses table (seeded in migration 049).
 *
 * Optional query parameter: ?regulation=eu_ai_act to filter.
 * Auth required — same tenant resolution pattern as evidence-export.
 *
 * Phase 1 Task 1.2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
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
      return NextResponse.json(
        { error: 'Tenant context required. Provide via Authorization header or X-Tenant-Id header.' },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    // Optional regulation filter
    const regulationFilter = req.nextUrl.searchParams.get('regulation');

    let query = supabase
      .from('regulation_clauses')
      .select('regulation, clause_ref, clause_title, clause_description, evidence_sources, required_for_coverage')
      .order('clause_ref', { ascending: true });

    if (regulationFilter) {
      query = query.eq('regulation', regulationFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[compliance/regulations] query error:', error);
      return NextResponse.json({ error: 'Failed to fetch regulations' }, { status: 500 });
    }

    // Group by regulation
    const grouped: Record<string, Array<{
      clause_ref: string;
      clause_title: string;
      description: string | null;
      evidence_sources: any[];
      required_for_coverage: boolean;
    }>> = {};

    for (const row of data ?? []) {
      if (!grouped[row.regulation]) {
        grouped[row.regulation] = [];
      }
      grouped[row.regulation].push({
        clause_ref: row.clause_ref,
        clause_title: row.clause_title,
        description: row.clause_description ?? null,
        evidence_sources: row.evidence_sources ?? [],
        required_for_coverage: row.required_for_coverage ?? true,
      });
    }

    const regulations = Object.entries(grouped).map(([regulation, clauses]) => ({
      regulation,
      clauses,
    }));

    return NextResponse.json({ regulations }, { status: 200 });
  } catch (err) {
    console.error('[compliance/regulations] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

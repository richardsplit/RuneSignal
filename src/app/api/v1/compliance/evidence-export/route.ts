/**
 * POST /api/v1/compliance/evidence-export
 *
 * EU AI Act Evidence Package Export endpoint.
 * Generates a structured JSON manifest mapping provenance, HITL, and
 * explainability events to the relevant EU AI Act articles.
 *
 * Delegates to the existing EuAiActReportGenerator for the heavy lifting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import { EvidenceService } from '@lib/services/evidence-service';
import { AuditLedgerService } from '@lib/ledger/service';
import type { EuAiActReport } from '@lib/modules/compliance/eu-ai-act-report';
import type { Iso42001Report } from '@lib/modules/compliance/iso-42001-report';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

type Regulation = 'eu_ai_act' | 'iso_42001';

interface EvidenceExportRequest {
  tenant_id?: string;
  date_range: {
    start: string;
    end: string;
  };
  regulation: Regulation;
}

interface EvidenceExportResponse {
  export_id: string;
  regulation: Regulation;
  status: 'ready' | 'generating' | 'failed';
  evidence_manifest: EuAiActReport | Iso42001Report;
}

/**
 * Resolve tenant ID from (in order):
 *  1. API key in Authorization header
 *  2. X-Tenant-Id header
 *  3. tenant_id in request body
 *
 * Never falls back to a hardcoded value.
 */
async function resolveTenantId(
  req: NextRequest,
  bodyTenantId?: string,
): Promise<string | null> {
  // 1. Try API key
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

  // 2. X-Tenant-Id header
  const headerTenantId = req.headers.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  // 3. Body tenant_id
  if (bodyTenantId) return bodyTenantId;

  return null;
}

export async function POST(req: NextRequest) {
  let body: EvidenceExportRequest | undefined;
  let tenantId: string | null = null;
  try {
    body = await req.json() as EvidenceExportRequest;
    if (!body) throw new Error('Empty request body');

    // Validate required fields
    if (!body.date_range?.start || !body.date_range?.end) {
      return NextResponse.json(
        { error: 'date_range.start and date_range.end are required' },
        { status: 400 },
      );
    }

    if (!body.regulation) {
      return NextResponse.json(
        { error: 'regulation is required (eu_ai_act | iso_42001)' },
        { status: 400 },
      );
    }

    const validRegulations: Regulation[] = ['eu_ai_act', 'iso_42001'];
    if (!validRegulations.includes(body.regulation)) {
      return NextResponse.json(
        { error: `Invalid regulation. Must be one of: ${validRegulations.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve tenant - NO 'demo-tenant' fallback
    tenantId = await resolveTenantId(req, body.tenant_id);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required. Provide via Authorization header, X-Tenant-Id header, or tenant_id in body.' },
        { status: 401 },
      );
    }

    // Delegate to EvidenceService for unified generation, signing, and storage
    const bundle = await EvidenceService.generate({
      tenant_id: tenantId,
      regulation: body.regulation,
      period: { start: body.date_range.start, end: body.date_range.end },
      generated_by: req.headers.get('x-user-id') || 'api',
    });

    // Fire-and-forget audit logging for JSON export
    AuditLedgerService.appendEvent({
      event_type: 'evidence.exported.json',
      module: 's13',
      tenant_id: tenantId,
      payload: { export_id: bundle.id, regulation: body.regulation },
    }).catch(() => {}); // Don't fail the request on audit error

    const response: EvidenceExportResponse = {
      export_id: bundle.id,
      regulation: body.regulation,
      status: 'ready',
      evidence_manifest: bundle.manifest,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: '/api/v1/compliance/evidence-export', component: 'evidence-export' },
      extra: { regulation: body?.regulation, tenant_id: tenantId },
    });
    console.error('[compliance/evidence-export] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

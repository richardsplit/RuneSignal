/**
 * Agent Classification API — EU AI Act risk category management.
 *
 * GET  /api/v1/agents/{id}/classification — Get current classification
 * POST /api/v1/agents/{id}/classification — Trigger reclassification
 * PUT  /api/v1/agents/{id}/classification — Set manual override
 *
 * EU AI Act Article 5, Annex III, Article 52
 * Phase 5 Task 5.2.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';
import {
  AgentClassificationService,
  type EuAiActCategory,
} from '@lib/services/agent-classification-service';

const VALID_CATEGORIES: EuAiActCategory[] = [
  'prohibited',
  'high_risk',
  'limited_risk',
  'minimal_risk',
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: agent, error } = await supabase
      .from('agent_inventory')
      .select('id, name, eu_ai_act_category, metadata')
      .eq('id', id)
      .eq('org_id', tenantId)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const metadata = (agent.metadata as Record<string, unknown>) || {};

    return NextResponse.json({
      agent_id: agent.id,
      name: agent.name,
      eu_ai_act_category: agent.eu_ai_act_category,
      confidence: metadata.classification_confidence || null,
      reasoning: metadata.classification_reasoning || [],
      classified_at: metadata.classified_at || null,
      is_manual_override: metadata.classification_manual_override === true,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const result = await AgentClassificationService.classify(tenantId, id);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const body = await req.json();
    const { category, reason } = body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    await AgentClassificationService.setManualOverride(tenantId, id, category, reason);

    return NextResponse.json({
      agent_id: id,
      eu_ai_act_category: category,
      is_manual_override: true,
      reason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

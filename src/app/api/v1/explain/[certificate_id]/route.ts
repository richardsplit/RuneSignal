import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';

/**
 * GET /api/v1/explain/[certificate_id]
 * PUBLIC endpoint — no authentication required.
 * Regulators and auditors can verify an AI decision explanation by certificate ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { certificate_id: string } }
) {
  const supabase = createAdminClient();

  const { data: explanation, error } = await supabase
    .from('certificate_explanations')
    .select('id, certificate_id, decision_summary, key_factors, counterfactual, confidence_score, regulatory_refs, status, created_at, completed_at')
    .eq('certificate_id', params.certificate_id)
    .eq('status', 'complete')
    .single();

  if (error || !explanation) {
    return NextResponse.json({ error: 'Explanation not found for this certificate ID' }, { status: 404 });
  }

  return NextResponse.json(
    { explanation },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'X-RuneSignal-Public': 'true',
      },
    }
  );
}

import { NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { EmbeddingService } from '../../../../../lib/ai/embeddings';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('arbiter_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ policies: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-Id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing Tenant Authentication' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, intent_category, policy_action } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate semantic embedding for the policy description
    const embedding = await EmbeddingService.generate(description);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('arbiter_policies')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        intent_category,
        policy_action: policy_action || 'block',
        embedding
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Policy Creation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ report_id: string }> }
) {
  try {
    const { report_id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('compliance_reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

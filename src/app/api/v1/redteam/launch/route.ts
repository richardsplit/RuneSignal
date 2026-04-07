import { NextRequest, NextResponse } from 'next/server';
import { RedTeamService } from '../../../../../../lib/modules/s17-redteam/service';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const body = await request.json();
    const { target_agent_id } = body;

    if (!target_agent_id) return NextResponse.json({ error: 'target_agent_id required' }, { status: 400 });

    // Launch campaign asynchronously — respond immediately with campaign ID
    const campaignId = await RedTeamService.launchCampaign(tenantId, target_agent_id);

    return NextResponse.json({ success: true, campaign_id: campaignId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('X-Tenant-Id');
  if (!tenantId) return NextResponse.json({ error: 'Missing X-Tenant-Id' }, { status: 400 });

  try {
    const [campaigns, score] = await Promise.all([
        RedTeamService.getLatestCampaigns(tenantId),
        RedTeamService.getResilienceScore(tenantId)
    ]);
    return NextResponse.json({ campaigns, resilience_score: score });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

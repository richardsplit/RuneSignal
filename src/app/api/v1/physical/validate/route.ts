import { NextRequest, NextResponse } from 'next/server';
import { PhysicalAIService } from '../../../../../../lib/modules/s15-physical/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { node_id, velocity_ms, lat, lon } = body;

    if (!node_id || velocity_ms === undefined) {
       return NextResponse.json({ error: 'node_id and velocity_ms required' }, { status: 400 });
    }

    const result = await PhysicalAIService.validateKineticCommand(node_id, {
        velocity_ms,
        lat,
        lon
    });
    
    // Very fast raw HTTP response for edge hardware latency mitigation
    return NextResponse.json(result, { status: result.allowed ? 200 : 403 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

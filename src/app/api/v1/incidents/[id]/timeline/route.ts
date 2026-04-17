/**
 * GET  /api/v1/incidents/{id}/timeline — Get incident timeline entries
 * POST /api/v1/incidents/{id}/timeline — Add timeline entry (comment, evidence)
 *
 * EU AI Act Article 73 — Serious Incident Reporting
 * ISO 42001 Clause 10.2 — Incident Documentation
 *
 * Phase 3 Task 3.1.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { IncidentService } from '@lib/services/incident-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const entries = await IncidentService.getTimeline(id, limit, offset);

    return NextResponse.json({ entries });
  } catch (err) {
    console.error('[incidents/{id}/timeline GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const actor = req.headers.get('x-user-id');
    if (!actor) {
      return NextResponse.json(
        { error: 'x-user-id header is required to identify the actor' },
        { status: 400 },
      );
    }

    if (!body.event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }
    if (!body.detail || typeof body.detail !== 'object') {
      return NextResponse.json({ error: 'detail is required and must be an object' }, { status: 400 });
    }

    const entry = await IncidentService.addTimelineEntry(id, body.event_type, actor, body.detail);

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error('[incidents/{id}/timeline POST] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

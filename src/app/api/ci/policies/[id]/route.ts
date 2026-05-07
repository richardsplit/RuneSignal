import { NextRequest, NextResponse } from 'next/server';
const CI_API = process.env.CI_API_URL ?? 'http://localhost:8000';
const key = () => process.env.CI_SERVICE_API_KEY ?? '';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();
  try {
    const res = await fetch(`${CI_API}/v1/policies/${id}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' }, body,
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ error: 'CI API unavailable' }, { status: 503 }); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await fetch(`${CI_API}/v1/policies/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${key()}` } });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ error: 'CI API unavailable' }, { status: 503 }); }
}

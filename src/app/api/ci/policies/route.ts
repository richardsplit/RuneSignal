import { NextRequest, NextResponse } from 'next/server';
const CI_API = process.env.CI_API_URL ?? 'http://localhost:8000';
const key = () => process.env.CI_SERVICE_API_KEY ?? '';

export async function GET() {
  try {
    const res = await fetch(`${CI_API}/v1/policies`, { headers: { Authorization: `Bearer ${key()}` }, next: { revalidate: 30 } });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ error: 'CI API unavailable' }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const res = await fetch(`${CI_API}/v1/policies`, {
      method: 'POST', headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' }, body,
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ error: 'CI API unavailable' }, { status: 503 }); }
}

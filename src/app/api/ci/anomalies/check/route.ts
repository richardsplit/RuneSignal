import { NextResponse } from 'next/server';
const CI_API = process.env.CI_API_URL ?? 'http://localhost:8000';
const key = () => process.env.CI_SERVICE_API_KEY ?? '';

export async function POST() {
  try {
    const res = await fetch(`${CI_API}/v1/anomalies/check`, { method: 'POST', headers: { Authorization: `Bearer ${key()}` } });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ error: 'CI API unavailable' }, { status: 503 }); }
}

import { NextRequest, NextResponse } from 'next/server';
const CI_API = process.env.CI_API_URL ?? 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') ?? '';
  const apiKey = process.env.CI_SERVICE_API_KEY ?? '';
  try {
    const res = await fetch(`${CI_API}/v1/features${month ? `?month=${month}` : ''}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, next: { revalidate: 120 } });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'CI API unavailable' }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const CI_API = process.env.CI_API_URL ?? 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') ?? '';
  const apiKey = req.headers.get('x-ci-api-key') ?? process.env.CI_SERVICE_API_KEY ?? '';

  try {
    const res = await fetch(
      `${CI_API}/v1/margins${month ? `?month=${month}` : ''}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 60 },
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'CI API unavailable' }, { status: 503 });
  }
}

import { NextResponse } from 'next/server';

const CI_API = process.env.CI_API_URL ?? 'http://localhost:8000';

export async function GET() {
  const apiKey = process.env.CI_SERVICE_API_KEY ?? '';

  try {
    const res = await fetch(`${CI_API}/v1/margins/trend`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'CI API unavailable' }, { status: 503 });
  }
}

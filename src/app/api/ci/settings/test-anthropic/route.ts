import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { key } = await req.json();
  if (!key || !String(key).startsWith('sk-ant-')) {
    return NextResponse.json({ error: 'Invalid key format' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
    });
    if (res.status === 200) return NextResponse.json({ ok: true });
    if (res.status === 401) return NextResponse.json({ error: 'Invalid key' }, { status: 401 });
    return NextResponse.json({ error: 'Anthropic error' }, { status: 502 });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
}

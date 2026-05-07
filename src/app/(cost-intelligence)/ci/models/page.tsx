'use client';
import { useEffect, useState } from 'react';

interface ModelRow {
  model: string;
  provider: string;
  request_count: number;
  total_cost_usd: number;
  avg_cost_per_request: number;
  total_input_tokens: number;
  total_output_tokens: number;
  cost_share_pct: number;
}

const PROVIDER_COLOR: Record<string, string> = {
  openai: '#10b981', anthropic: '#f97316', gemini: '#6366f1', other: '#64748b',
};

export default function ModelsPage() {
  const [rows, setRows]       = useState<ModelRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [month, setMonth]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setMonth(m);
    fetchData(m);
  }, []);

  async function fetchData(m: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/ci/margins/models?month=${m}`);
      if (res.ok) {
        const d = await res.json();
        setRows(d.models ?? []);
        setTotal(d.total_cost_usd ?? 0);
      }
    } catch { /* empty state */ }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            AI Spend by Model
          </h1>
          <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            Total cost: <strong style={{ color: '#e2e8f0' }}>${total.toFixed(2)}</strong> · sorted by cost descending
          </p>
        </div>
        <input type="month" value={month}
          onChange={e => { setMonth(e.target.value); fetchData(e.target.value); }}
          style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0',
            borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} />
      </div>

      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.07)',
        borderRadius: '0.75rem', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
            No inference logs for this month yet.
          </div>
        ) : (
          <>
            {/* Bar chart header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', height: 48, alignItems: 'flex-end' }}>
                {rows.slice(0, 10).map(r => (
                  <div key={r.model} title={`${r.model}: $${r.total_cost_usd.toFixed(4)}`}
                    style={{ flex: r.cost_share_pct, minWidth: 8, background:
                      PROVIDER_COLOR[r.provider] ?? '#475569', borderRadius: '3px 3px 0 0',
                      opacity: 0.85, cursor: 'help',
                      height: `${Math.max(4, (r.cost_share_pct / (rows[0]?.cost_share_pct || 1)) * 48)}px`,
                    }} />
                ))}
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                  {['Model', 'Provider', 'Requests', 'Total Cost', '% of Bill', 'Avg Cost / Req'].map(h => (
                    <th key={h} style={{ padding: '0.7rem 1rem', textAlign: h === 'Model' ? 'left' : 'right',
                      fontSize: '0.72rem', color: '#475569', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.model} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                    <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#e2e8f0', fontFamily: 'monospace' }}>
                      {r.model}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                        borderRadius: '2rem', background: `${PROVIDER_COLOR[r.provider] ?? '#475569'}15`,
                        color: PROVIDER_COLOR[r.provider] ?? '#475569' }}>
                        {r.provider}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: '#94a3b8' }}>
                      {r.request_count.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.85rem',
                      color: '#e2e8f0', fontWeight: 600 }}>
                      ${r.total_cost_usd.toFixed(4)}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${r.cost_share_pct}%`, height: '100%',
                            background: PROVIDER_COLOR[r.provider] ?? '#475569', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8', minWidth: 36, textAlign: 'right' }}>
                          {r.cost_share_pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: '#64748b' }}>
                      ${r.avg_cost_per_request.toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

interface TrendMonth {
  month: string;
  ai_cost_usd: number;
  revenue_usd: number;
  gross_margin_pct: number | null;
}

export default function TrendsPage() {
  const [data, setData]       = useState<TrendMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/ci/margins/trend');
      if (res.ok) setData((await res.json()).months ?? []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }

  const formatted = data.map(d => ({
    ...d,
    label: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
  }));

  const lastMonth = formatted.at(-1);

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
          Monthly Trends
        </h1>
        <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          AI inference cost vs MRR — last 6 months
        </p>
      </div>

      {lastMonth && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px',
          background: 'rgba(255,255,255,.06)', borderRadius: '0.75rem', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,.06)', marginBottom: '1.5rem' }}>
          {[
            { label: 'MRR (latest)',      value: `$${lastMonth.revenue_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
            { label: 'AI Cost (latest)',  value: `$${lastMonth.ai_cost_usd.toFixed(2)}` },
            { label: 'Gross Margin',      value: lastMonth.gross_margin_pct !== null ? `${lastMonth.gross_margin_pct.toFixed(1)}%` : '—' },
          ].map(k => (
            <div key={k.label} style={{ background: '#0d1117', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{k.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.07)',
        borderRadius: '0.75rem', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#475569' }}>Loading chart…</div>
        ) : formatted.length < 2 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '2rem' }}>📈</div>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>Not enough data yet</div>
            <div style={{ color: '#475569', fontSize: '0.85rem' }}>Need at least 2 months of data for the trend chart.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#475569', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}
                formatter={(val: number, name: string): [string, string] => [
                  `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  name,
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 13, color: '#94a3b8', paddingTop: 12 }}
              />
              <Line
                type="monotone" dataKey="revenue_usd" name="MRR"
                stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone" dataKey="ai_cost_usd" name="AI Cost"
                stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }}
                activeDot={{ r: 6 }} strokeDasharray="6 3"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Margin trend bar */}
      {formatted.length > 0 && (
        <div style={{ marginTop: '1.5rem', background: '#0d1117',
          border: '1px solid rgba(255,255,255,.07)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: '1rem' }}>Gross margin % by month</div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', height: 64 }}>
            {formatted.map(m => {
              const pct = m.gross_margin_pct;
              const color = pct === null ? '#475569' : pct < 0 ? '#ef4444' : pct < 30 ? '#f97316' : '#10b981';
              const height = pct !== null ? Math.abs(pct) / 100 * 60 : 4;
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ fontSize: '0.65rem', color, fontWeight: 700 }}>
                    {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                  </div>
                  <div style={{ width: '100%', height: `${height}px`, background: color,
                    borderRadius: '3px 3px 0 0', opacity: 0.8, minHeight: 4 }} />
                  <div style={{ fontSize: '0.65rem', color: '#334155' }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';

interface CustomerMargin {
  customer_id: string;
  display_name: string | null;
  revenue_usd: number;
  ai_cost_usd: number;
  gross_margin_pct: number | null;
  request_count: number;
  plan_tier: string | null;
  is_dangerous: boolean;
  revenue_share_pct: number | null;
  ai_cost_share_pct: number | null;
}

interface MarginSummary {
  month: string;
  customers: CustomerMargin[];
  total_revenue_usd: number;
  total_ai_cost_usd: number;
  overall_margin_pct: number | null;
}

type SortKey = 'gross_margin_pct' | 'revenue_usd' | 'ai_cost_usd' | 'customer_id';

function marginColor(pct: number | null): string {
  if (pct === null) return '#f59e0b';
  if (pct < 0)  return '#ef4444';
  if (pct < 30) return '#f97316';
  return '#10b981';
}

function marginBadge(pct: number | null, dangerous: boolean) {
  if (pct === null) return { label: 'No revenue', color: '#f59e0b', bg: 'rgba(245,158,11,.1)' };
  if (pct < 0)     return { label: '🔴 Negative', color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
  if (pct < 30)    return { label: '🟡 Warning',  color: '#f97316', bg: 'rgba(249,115,22,.1)' };
  return              { label: '🟢 Healthy',  color: '#10b981', bg: 'rgba(16,185,129,.1)' };
}

export default function CustomerMarginsPage() {
  const [data, setData]       = useState<MarginSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth]     = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('gross_margin_pct');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setMonth(m);
    fetchData(m);
  }, []);

  async function fetchData(m: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/ci/margins?month=${m}`);
      if (res.ok) setData(await res.json());
    } catch { /* show empty state */ }
    finally { setLoading(false); }
  }

  function sort(key: SortKey) {
    if (sortKey === key) { setSortAsc(a => !a); return; }
    setSortKey(key);
    setSortAsc(key === 'gross_margin_pct'); // worst first by default
  }

  const sorted = [...(data?.customers ?? [])].sort((a, b) => {
    let av: number, bv: number;
    if (sortKey === 'gross_margin_pct') {
      av = a.gross_margin_pct ?? (sortAsc ? 999 : -999);
      bv = b.gross_margin_pct ?? (sortAsc ? 999 : -999);
    } else if (sortKey === 'customer_id') {
      return sortAsc
        ? (a.display_name ?? a.customer_id).localeCompare(b.display_name ?? b.customer_id)
        : (b.display_name ?? b.customer_id).localeCompare(a.display_name ?? a.customer_id);
    } else {
      av = a[sortKey]; bv = b[sortKey];
    }
    return sortAsc ? av - bv : bv - av;
  });

  const TH = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => sort(k)}
      style={{ padding: '0.7rem 1rem', textAlign: k === 'customer_id' ? 'left' : 'right',
        fontSize: '0.72rem', color: sortKey === k ? '#818cf8' : '#475569', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
        userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            Customer Margin Table
          </h1>
          <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            Sorted by gross margin ascending — worst offenders first
          </p>
        </div>
        <input
          type="month"
          value={month}
          onChange={e => { setMonth(e.target.value); fetchData(e.target.value); }}
          style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0',
            borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        />
      </div>

      {/* KPI strip */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px',
          background: 'rgba(255,255,255,.06)', borderRadius: '0.75rem', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,.06)', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total MRR',      value: `$${data.total_revenue_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
            { label: 'Total AI Cost',  value: `$${data.total_ai_cost_usd.toFixed(2)}` },
            { label: 'Gross Margin',   value: data.overall_margin_pct !== null ? `${data.overall_margin_pct.toFixed(1)}%` : '—' },
            { label: 'Dangerous',      value: String(data.customers.filter(c => c.is_dangerous).length) },
          ].map(k => (
            <div key={k.label} style={{ background: '#0d1117', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{k.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.07)',
        borderRadius: '0.75rem', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
            Loading margin data…
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '0.5rem' }}>No data yet</div>
            <div style={{ color: '#475569', fontSize: '0.85rem' }}>
              Connect your OpenAI key and add the SDK to start seeing margin data.
            </div>
            <a href="/ci-onboarding" style={{ display: 'inline-block', marginTop: '1rem',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
              padding: '0.65rem 1.5rem', borderRadius: '0.5rem', textDecoration: 'none',
              fontWeight: 700, fontSize: '0.875rem' }}>
              Start setup →
            </a>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                <TH k="customer_id"    label="Customer" />
                <TH k="revenue_usd"    label="Revenue / Mo" />
                <TH k="ai_cost_usd"    label="AI Cost / Mo" />
                <TH k="gross_margin_pct" label="Gross Margin" />
                <th style={{ padding: '0.7rem 1rem', textAlign: 'right', fontSize: '0.72rem',
                  color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  AI Cost Share
                </th>
                <th style={{ padding: '0.7rem 1rem', textAlign: 'center', fontSize: '0.72rem',
                  color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => {
                const badge = marginBadge(c.gross_margin_pct, c.is_dangerous);
                const name  = c.display_name ?? c.customer_id;
                return (
                  <tr key={c.customer_id}
                    style={{ borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                      background: c.is_dangerous ? 'rgba(239,68,68,.03)' : 'transparent' }}>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>{name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#334155', fontFamily: 'monospace' }}>
                        {c.customer_id}
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                      ${c.revenue_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.85rem',
                      color: c.ai_cost_usd > c.revenue_usd ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
                      ${c.ai_cost_usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: marginColor(c.gross_margin_pct) }}>
                        {c.gross_margin_pct !== null ? `${c.gross_margin_pct.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: '#64748b' }}>
                      {c.ai_cost_share_pct !== null ? `${c.ai_cost_share_pct}%` : '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                        borderRadius: '2rem', background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

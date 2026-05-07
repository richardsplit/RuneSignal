'use client';
import { useEffect, useState } from 'react';

interface FeatureMargin {
  feature_tag: string;
  activations: number;
  total_cost_usd: number;
  cost_per_activation: number;
  revenue_usd: number;
  gross_margin_pct: number | null;
  margin_status: 'negative' | 'warning' | 'acceptable' | 'healthy';
  top_model: string | null;
  savings_potential_usd: number;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  negative:   { label: '🔴 Negative',   color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
  warning:    { label: '🟠 Warning',    color: '#f97316', bg: 'rgba(249,115,22,.1)' },
  acceptable: { label: '🟡 Acceptable', color: '#eab308', bg: 'rgba(234,179,8,.1)' },
  healthy:    { label: '🟢 Healthy',    color: '#10b981', bg: 'rgba(16,185,129,.1)' },
};

const HEATMAP_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#10b981'];
function heatColor(pct: number | null): string {
  if (pct === null || pct < 0) return HEATMAP_COLORS[0];
  if (pct < 10)  return HEATMAP_COLORS[1];
  if (pct < 30)  return HEATMAP_COLORS[2];
  if (pct < 60)  return HEATMAP_COLORS[3];
  return HEATMAP_COLORS[4];
}

export default function FeaturesPage() {
  const [features, setFeatures]         = useState<FeatureMargin[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [dangerCount, setDangerCount]   = useState(0);
  const [loading, setLoading]           = useState(true);
  const [month, setMonth]               = useState('');
  const [view, setView]                 = useState<'table' | 'heatmap'>('heatmap');

  useEffect(() => {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setMonth(m);
    load(m);
  }, []);

  async function load(m: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/ci/features?month=${m}`);
      if (res.ok) {
        const d = await res.json();
        setFeatures(d.features ?? []);
        setTotalSavings(d.total_savings_potential_usd ?? 0);
        setDangerCount(d.dangerous_count ?? 0);
      }
    } catch { /* empty */ }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            Feature Profitability
          </h1>
          <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            Which product features are bleeding margin?
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="month" value={month}
            onChange={e => { setMonth(e.target.value); load(e.target.value); }}
            style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0',
              borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} />
          {['heatmap', 'table'].map(v => (
            <button key={v} onClick={() => setView(v as 'heatmap' | 'table')}
              style={{ padding: '0.5rem 0.875rem', borderRadius: '0.4rem', fontSize: '0.78rem',
                fontWeight: 600, cursor: 'pointer', border: '1px solid',
                background: view === v ? 'rgba(99,102,241,.12)' : 'transparent',
                color: view === v ? '#a5b4fc' : '#475569',
                borderColor: view === v ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.08)' }}>
              {v === 'heatmap' ? '🟥 Heatmap' : '📋 Table'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px',
        background: 'rgba(255,255,255,.06)', borderRadius: '0.75rem', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,.06)', marginBottom: '1.5rem' }}>
        {[
          { label: 'Features Tracked', value: String(features.length) },
          { label: 'Dangerous Features', value: String(dangerCount), danger: dangerCount > 0 },
          { label: 'Savings Potential', value: `$${totalSavings.toFixed(2)}/mo` },
        ].map(k => (
          <div key={k.label} style={{ background: '#0d1117', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{k.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800,
              color: k.danger ? '#ef4444' : '#e2e8f0' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Loading…</div>
      ) : features.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#0d1117',
          border: '1px solid rgba(255,255,255,.07)', borderRadius: '0.75rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏷️</div>
          <div style={{ color: '#e2e8f0', fontWeight: 600 }}>No feature tags yet</div>
          <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Add <code style={{ background: 'rgba(99,102,241,.1)', color: '#a5b4fc',
              padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>feature_tag=</code> to your{' '}
            <code style={{ background: 'rgba(99,102,241,.1)', color: '#a5b4fc',
              padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>@runesignal.track</code> calls.
          </div>
        </div>
      ) : view === 'heatmap' ? (
        /* Heatmap grid */
        <div>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '0.875rem',
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cell size = AI cost · Color = gross margin %
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {features.map(f => {
              const style = STATUS_STYLES[f.margin_status] ?? STATUS_STYLES.acceptable;
              const maxCost = features[0]?.total_cost_usd || 1;
              const sizeFactor = Math.max(0.4, f.total_cost_usd / maxCost);
              return (
                <div key={f.feature_tag} title={`${f.feature_tag}\nCost: $${f.total_cost_usd.toFixed(4)}\nMargin: ${f.gross_margin_pct?.toFixed(1) ?? '—'}%`}
                  style={{ background: heatColor(f.gross_margin_pct),
                    borderRadius: '0.5rem', padding: `${12 + sizeFactor * 20}px ${16 + sizeFactor * 24}px`,
                    cursor: 'default', opacity: 0.85,
                    minWidth: `${80 + sizeFactor * 80}px`, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,.5)', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                    {f.feature_tag}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,.8)', marginTop: '0.2rem' }}>
                    {f.gross_margin_pct !== null ? `${f.gross_margin_pct.toFixed(0)}%` : 'no rev'}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem',
            fontSize: '0.72rem', color: '#475569' }}>
            <span>Margin:</span>
            {[['#ef4444','< 0%'],['#f97316','0–10%'],['#eab308','10–30%'],['#22c55e','30–60%'],['#10b981','> 60%']].map(([c,l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* Table view */
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: '0.75rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                {['Feature', 'Activations', 'AI Cost', 'Margin', 'Top Model', 'Savings', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: h === 'Feature' ? 'left' : 'right',
                    fontSize: '0.72rem', color: '#475569', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => {
                const s = STATUS_STYLES[f.margin_status] ?? STATUS_STYLES.acceptable;
                return (
                  <tr key={f.feature_tag} style={{ borderBottom: i < features.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                    <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>
                      <code style={{ background: 'rgba(99,102,241,.08)', color: '#a5b4fc',
                        padding: '0.15rem 0.4rem', borderRadius: '0.3rem', fontSize: '0.78rem' }}>
                        {f.feature_tag}
                      </code>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: '#64748b' }}>
                      {f.activations.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
                      ${f.total_cost_usd.toFixed(4)}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 800,
                      color: heatColor(f.gross_margin_pct), fontSize: '0.95rem' }}>
                      {f.gross_margin_pct !== null ? `${f.gross_margin_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.75rem',
                      color: '#64748b', fontFamily: 'monospace' }}>
                      {f.top_model ?? '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '0.82rem',
                      color: f.savings_potential_usd > 0 ? '#10b981' : '#334155', fontWeight: 600 }}>
                      {f.savings_potential_usd > 0 ? `$${f.savings_potential_usd.toFixed(4)}` : '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                        borderRadius: '2rem', background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

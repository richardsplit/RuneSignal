'use client';
import { useEffect, useState } from 'react';

interface Policy {
  id: string;
  scope_type: 'global' | 'customer' | 'endpoint';
  scope_value: string;
  daily_limit_usd: number | null;
  monthly_limit_usd: number | null;
  soft_action: string;
  hard_action: string;
  fallback_model: string | null;
  is_active: boolean;
}

interface Consumption {
  policy_id: string;
  scope_type: string;
  scope_value: string;
  daily?: { usage_usd: number; limit_usd: number; pct_used: number };
  monthly?: { usage_usd: number; limit_usd: number; pct_used: number };
}

const MODELS = [
  'gpt-4o', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'claude-3-5-sonnet', 'claude-3-5-haiku', 'gemini-2.5-pro', 'gemini-2.5-flash',
];

const ACTIONS = ['allow', 'downgrade_model', 'terminate'];

function UsageBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f97316' : '#10b981';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: '0.75rem', color, fontWeight: 600, minWidth: 36 }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function PoliciesPage() {
  const [policies, setPolicies]         = useState<Policy[]>([]);
  const [consumption, setConsumption]   = useState<Consumption[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm] = useState({
    scope_type: 'global',
    scope_value: '',
    daily_limit_usd: '',
    monthly_limit_usd: '',
    soft_action: 'downgrade_model',
    hard_action: 'terminate',
    fallback_model: 'gpt-4o-mini',
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        fetch('/api/ci/policies').then(r => r.json()),
        fetch('/api/ci/policies/consumption').then(r => r.json()),
      ]);
      setPolicies(p.policies ?? []);
      setConsumption(c.consumption ?? []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/ci/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        daily_limit_usd: form.daily_limit_usd ? Number(form.daily_limit_usd) : null,
        monthly_limit_usd: form.monthly_limit_usd ? Number(form.monthly_limit_usd) : null,
      }),
    });
    if (res.ok) { setShowForm(false); loadAll(); }
  }

  async function deactivate(id: string) {
    await fetch(`/api/ci/policies/${id}`, { method: 'DELETE' });
    setPolicies(p => p.filter(x => x.id !== id));
  }

  const consumptionMap = Object.fromEntries(consumption.map(c => [c.policy_id, c]));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            Budget Guardrails
          </h1>
          <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            Set hard and soft limits — the proxy enforces them before forwarding to OpenAI
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
            border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.25rem',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
          + New policy
        </button>
      </div>

      {/* New policy form */}
      {showForm && (
        <form onSubmit={submit} style={{ background: '#0d1117', border: '1px solid rgba(99,102,241,.2)',
          borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: '#e2e8f0' }}>New Budget Policy</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Scope</label>
              <select value={form.scope_type} onChange={e => setForm(f => ({ ...f, scope_type: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
                  color: '#e2e8f0', borderRadius: '0.4rem', padding: '0.55rem', fontSize: '0.82rem' }}>
                {['global','customer','endpoint'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Scope Value (leave blank for global)</label>
              <input value={form.scope_value} onChange={e => setForm(f => ({ ...f, scope_value: e.target.value }))}
                placeholder="customer_id or endpoint_id"
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0', borderRadius: '0.4rem',
                  padding: '0.55rem 0.75rem', fontSize: '0.82rem', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Fallback Model</label>
              <select value={form.fallback_model} onChange={e => setForm(f => ({ ...f, fallback_model: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
                  color: '#e2e8f0', borderRadius: '0.4rem', padding: '0.55rem', fontSize: '0.82rem' }}>
                {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            {[['Daily limit ($)', 'daily_limit_usd'], ['Monthly limit ($)', 'monthly_limit_usd']].map(([label, key]) => (
              <div key={key}>
                <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
                <input type="number" min="0" step="0.01"
                  value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="e.g. 5.00"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0', borderRadius: '0.4rem',
                    padding: '0.55rem 0.75rem', fontSize: '0.82rem', outline: 'none' }} />
              </div>
            ))}
            {[['At 80% (soft)', 'soft_action'], ['At 100% (hard)', 'hard_action']].map(([label, key]) => (
              <div key={key}>
                <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
                <select value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
                    color: '#e2e8f0', borderRadius: '0.4rem', padding: '0.55rem', fontSize: '0.82rem' }}>
                  {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none',
                borderRadius: '0.4rem', padding: '0.6rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}>
              Create policy
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,.1)', color: '#475569',
                borderRadius: '0.4rem', padding: '0.6rem 1rem', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.07)',
        borderRadius: '0.75rem', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>Loading…</div>
        ) : policies.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>No guardrails set</div>
            <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Create a global monthly limit to prevent runaway costs.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                {['Scope', 'Daily limit', 'Daily usage', 'Monthly limit', 'Monthly usage', 'At 80% / 100%', ''].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: h === 'Scope' ? 'left' : 'center',
                    fontSize: '0.72rem', color: '#475569', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.map((p, i) => {
                const c = consumptionMap[p.id];
                return (
                  <tr key={p.id} style={{ borderBottom: i < policies.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', marginBottom: '0.15rem' }}>
                        {p.scope_type.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {p.scope_value || '— all —'}
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#e2e8f0' }}>
                      {p.daily_limit_usd ? `$${p.daily_limit_usd}` : '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', minWidth: 120 }}>
                      {c?.daily ? <UsageBar pct={c.daily.pct_used} /> : <span style={{ color: '#334155', fontSize: '0.72rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#e2e8f0' }}>
                      {p.monthly_limit_usd ? `$${p.monthly_limit_usd}` : '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', minWidth: 120 }}>
                      {c?.monthly ? <UsageBar pct={c.monthly.pct_used} /> : <span style={{ color: '#334155', fontSize: '0.72rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                      <span style={{ color: '#f97316' }}>{p.soft_action}</span>
                      {' / '}
                      <span style={{ color: p.hard_action === 'terminate' ? '#ef4444' : '#94a3b8' }}>{p.hard_action}</span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                      <button onClick={() => deactivate(p.id)}
                        style={{ background: 'none', border: '1px solid rgba(239,68,68,.2)',
                          color: '#ef4444', borderRadius: '0.35rem', padding: '0.25rem 0.6rem',
                          fontSize: '0.72rem', cursor: 'pointer' }}>
                        Disable
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Proxy usage instructions */}
      <div style={{ marginTop: '1.5rem', background: '#0d1117', border: '1px solid rgba(255,255,255,.07)',
        borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 0.875rem' }}>
          🔀 Route through the proxy to enforce these policies
        </h3>
        <pre style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: '0.5rem', padding: '1rem', fontSize: '0.75rem', color: '#94a3b8',
          lineHeight: 1.9, overflow: 'auto', margin: 0 }}>{`import openai
import runesignal

runesignal.configure(api_key="rs_live_YOUR_KEY")

client = openai.AsyncOpenAI(
    base_url=runesignal.proxy_url(),   # enforces all active policies
    api_key="your-openai-key",
    default_headers={
        "X-Customer-Id": user_id,      # optional: customer-scoped limits
    },
)

# Now every call goes through the guardrail engine.
# Soft limit → auto-downgraded to fallback model.
# Hard limit → 429 with explanation.`}</pre>
      </div>
    </div>
  );
}

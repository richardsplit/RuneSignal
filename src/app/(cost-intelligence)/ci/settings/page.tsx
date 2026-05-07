'use client';
import { useState } from 'react';

type Status = 'idle' | 'testing' | 'ok' | 'error';

function KeyInput({
  label, placeholder, hint, onTest,
}: {
  label: string;
  placeholder: string;
  hint?: string;
  onTest: (key: string) => Promise<boolean>;
}) {
  const [val, setVal]       = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleTest() {
    if (!val.trim()) return;
    setStatus('testing');
    const ok = await onTest(val.trim());
    setStatus(ok ? 'ok' : 'error');
  }

  const statusIcon = { idle: null, testing: '⏳', ok: '✓', error: '✗' }[status];
  const statusColor = { idle: '', testing: '#f59e0b', ok: '#10b981', error: '#ef4444' }[status];

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8',
        fontWeight: 600, marginBottom: '0.4rem' }}>{label}</label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="password"
          value={val}
          onChange={e => { setVal(e.target.value); setStatus('idle'); }}
          placeholder={placeholder}
          style={{ flex: 1, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.1)',
            color: '#e2e8f0', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', fontSize: '0.85rem',
            outline: 'none' }}
        />
        <button
          onClick={handleTest}
          disabled={!val.trim() || status === 'testing'}
          style={{ background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)',
            color: '#818cf8', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontWeight: 600,
            fontSize: '0.82rem', cursor: val.trim() ? 'pointer' : 'not-allowed', opacity: val.trim() ? 1 : 0.5 }}>
          {status === 'testing' ? 'Testing…' : 'Test & Save'}
        </button>
        {statusIcon && (
          <span style={{ display: 'flex', alignItems: 'center', fontWeight: 700,
            color: statusColor, fontSize: '1rem' }}>{statusIcon}</span>
        )}
      </div>
      {hint && <p style={{ fontSize: '0.72rem', color: '#334155', margin: '0.3rem 0 0' }}>{hint}</p>}
      {status === 'error' && (
        <p style={{ fontSize: '0.72rem', color: '#ef4444', margin: '0.3rem 0 0' }}>
          Connection failed — check the key and try again.
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.07)',
      borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.25rem' }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 1.25rem' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [stripeConnected, setStripeConnected] = useState(false);
  const [mappingKey, setMappingKey]   = useState('');
  const [mappingVal, setMappingVal]   = useState('');
  const [mappings, setMappings]       = useState<Array<{ stripe: string; internal: string }>>([]);

  async function testOpenAI(key: string): Promise<boolean> {
    try {
      const res = await fetch('/api/ci/settings/test-openai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      return res.ok;
    } catch { return false; }
  }

  async function testAnthropic(key: string): Promise<boolean> {
    try {
      const res = await fetch('/api/ci/settings/test-anthropic', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      return res.ok;
    } catch { return false; }
  }

  function addMapping() {
    if (!mappingKey.trim() || !mappingVal.trim()) return;
    setMappings(m => [...m, { stripe: mappingKey.trim(), internal: mappingVal.trim() }]);
    setMappingKey(''); setMappingVal('');
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
          Connections
        </h1>
        <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          Connect your AI providers and Stripe to start tracking margins
        </p>
      </div>

      <Section title="🤖 AI Providers">
        <KeyInput
          label="OpenAI API Key"
          placeholder="sk-..."
          hint="Used to pull model pricing context. We never make OpenAI calls on your behalf."
          onTest={testOpenAI}
        />
        <KeyInput
          label="Anthropic API Key (optional)"
          placeholder="sk-ant-..."
          onTest={testAnthropic}
        />
        <div style={{ background: 'rgba(99,102,241,.05)', border: '1px solid rgba(99,102,241,.15)',
          borderRadius: '0.5rem', padding: '0.875rem', fontSize: '0.78rem', color: '#64748b' }}>
          <strong style={{ color: '#818cf8' }}>SDK method (recommended):</strong> Add our decorator to
          your inference calls instead — no API key needed, richer attribution data.
          <pre style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.72rem',
            background: 'rgba(0,0,0,.3)', padding: '0.5rem 0.75rem', borderRadius: '0.4rem',
            overflow: 'auto' }}>{`pip install runesignal

import runesignal
runesignal.configure(api_key="rs_live_YOUR_KEY")

@runesignal.track(customer_id=customer_id, feature_tag="chat")
async def call_llm(prompt: str):
    return await openai_client.chat.completions.create(...)`}</pre>
        </div>
      </Section>

      <Section title="💳 Stripe Revenue Data">
        {stripeConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1rem', background: 'rgba(16,185,129,.06)',
            border: '1px solid rgba(16,185,129,.2)', borderRadius: '0.5rem' }}>
            <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>Stripe Connected</div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>Revenue events are syncing</div>
            </div>
            <button onClick={() => setStripeConnected(false)}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(239,68,68,.2)',
                color: '#ef4444', borderRadius: '0.4rem', padding: '0.3rem 0.6rem',
                fontSize: '0.72rem', cursor: 'pointer' }}>
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.6 }}>
              Connect Stripe to join revenue data with AI costs and see per-customer gross margins.
              We request <strong style={{ color: '#e2e8f0' }}>read-only</strong> access to charges and subscriptions only.
            </p>
            <button
              onClick={() => {
                window.location.href = '/api/ci/auth/stripe-connect';
              }}
              style={{ background: '#635bff', color: '#fff', border: 'none', borderRadius: '0.5rem',
                padding: '0.7rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
              Connect Stripe →
            </button>
            <button
              onClick={() => setStripeConnected(true)}
              style={{ marginLeft: '0.75rem', background: 'none', border: '1px solid rgba(255,255,255,.1)',
                color: '#475569', borderRadius: '0.5rem', padding: '0.7rem 1rem',
                fontSize: '0.875rem', cursor: 'pointer' }}>
              Skip for now
            </button>
          </div>
        )}
      </Section>

      <Section title="🔗 Customer ID Mapping">
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.6 }}>
          Map Stripe customer IDs to your internal customer IDs.
          This is how we join revenue data with inference logs.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input value={mappingKey} onChange={e => setMappingKey(e.target.value)}
            placeholder="Stripe customer ID (cus_...)"
            style={{ flex: 1, minWidth: 180, background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0', borderRadius: '0.5rem',
              padding: '0.6rem 0.875rem', fontSize: '0.82rem', outline: 'none' }} />
          <input value={mappingVal} onChange={e => setMappingVal(e.target.value)}
            placeholder="Internal customer ID"
            style={{ flex: 1, minWidth: 160, background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0', borderRadius: '0.5rem',
              padding: '0.6rem 0.875rem', fontSize: '0.82rem', outline: 'none' }} />
          <button onClick={addMapping}
            style={{ background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)',
              color: '#818cf8', borderRadius: '0.5rem', padding: '0.6rem 1rem',
              fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
            + Add
          </button>
        </div>
        {mappings.length > 0 && (
          <div style={{ border: '1px solid rgba(255,255,255,.06)', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {mappings.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.875rem',
                borderBottom: i < mappings.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                fontSize: '0.78rem' }}>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', flex: 1 }}>{m.stripe}</span>
                <span style={{ color: '#475569', margin: '0 0.5rem' }}>→</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace', flex: 1 }}>{m.internal}</span>
                <button onClick={() => setMappings(ms => ms.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: '#334155',
                    cursor: 'pointer', fontSize: '0.9rem', padding: '0 0.25rem' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="📋 SDK Quick Start">
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.875rem' }}>
          Your API key (add to environment variables):
        </div>
        <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: '0.5rem', padding: '0.875rem 1rem', fontFamily: 'monospace',
          fontSize: '0.78rem', color: '#10b981' }}>
          RUNESIGNAL_API_KEY=rs_live_••••••••••••••••
        </div>
        <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: '0.5rem', padding: '0.875rem 1rem', fontFamily: 'monospace',
          fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.9, overflow: 'auto' }}>
          {`# Install
pip install runesignal

# In your app startup
import runesignal
runesignal.configure(api_key=os.environ["RUNESIGNAL_API_KEY"])

# Wrap any async OpenAI call
@runesignal.track(customer_id=user.id, feature_tag="chat", endpoint_id="POST /chat")
async def chat(messages):
    return await openai.chat.completions.create(model="gpt-4o-mini", messages=messages)`}
        </div>
      </Section>
    </div>
  );
}

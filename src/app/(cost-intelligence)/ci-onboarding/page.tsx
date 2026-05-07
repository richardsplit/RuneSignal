'use client';
import { useState } from 'react';
import Link from 'next/link';

type Step = 1 | 2 | 3 | 4;

function ProgressBar({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Connect OpenAI' },
    { n: 2, label: 'Connect Stripe' },
    { n: 3, label: 'Add SDK' },
    { n: 4, label: "You're live" },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2.5rem' }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700,
              background: step > s.n ? '#10b981' : step === s.n ? '#6366f1' : 'rgba(255,255,255,.06)',
              color: step >= s.n ? '#fff' : '#475569',
              border: step === s.n ? '2px solid #818cf8' : 'none',
            }}>
              {step > s.n ? '✓' : s.n}
            </div>
            <span style={{ fontSize: '0.65rem', color: step === s.n ? '#e2e8f0' : '#334155',
              fontWeight: step === s.n ? 600 : 400, whiteSpace: 'nowrap' }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: '0 8px 18px',
              background: step > s.n ? '#10b981' : 'rgba(255,255,255,.08)' }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep]           = useState<Step>(1);
  const [openaiKey, setOpenaiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle'|'testing'|'ok'|'error'>('idle');
  const [stripeSkipped, setStripeSkipped] = useState(false);

  async function testOpenAI() {
    if (!openaiKey.trim()) return;
    setKeyStatus('testing');
    try {
      const res = await fetch('/api/ci/settings/test-openai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: openaiKey }),
      });
      setKeyStatus(res.ok ? 'ok' : 'error');
      if (res.ok) setTimeout(() => setStep(2), 600);
    } catch { setKeyStatus('error'); }
  }

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#e2e8f0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      padding: '4rem 1rem' }}>

      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
            RuneSignal · Cost Intelligence
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.04em',
            margin: '0 0 0.5rem' }}>
            {step < 4 ? 'Get set up in 5 minutes' : "You're all set 🎉"}
          </h1>
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>
            {step < 4
              ? 'Connect your data sources and add one line of code.'
              : 'Your first cost insight arrives within 24 hours.'}
          </p>
        </div>

        <ProgressBar step={step} />

        {/* Step 1: OpenAI key */}
        {step === 1 && (
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '0.75rem', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem' }}>
              Connect your OpenAI key
            </h2>
            <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              We use this to validate your key is active. We <strong style={{ color: '#e2e8f0' }}>never</strong> make
              inference calls using your key — you instrument your own code with our SDK.
            </p>
            <input
              type="password"
              value={openaiKey}
              onChange={e => { setOpenaiKey(e.target.value); setKeyStatus('idle'); }}
              placeholder="sk-..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.03)',
                border: `1px solid ${keyStatus === 'ok' ? 'rgba(16,185,129,.4)' : keyStatus === 'error' ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.1)'}`,
                color: '#e2e8f0', borderRadius: '0.5rem', padding: '0.75rem 1rem',
                fontSize: '0.9rem', outline: 'none', marginBottom: '1rem' }}
            />
            {keyStatus === 'error' && (
              <p style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                Key validation failed — check it&apos;s correct and active.
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={testOpenAI}
                disabled={!openaiKey.trim() || keyStatus === 'testing'}
                style={{ flex: 1, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                  border: 'none', borderRadius: '0.5rem', padding: '0.8rem', fontWeight: 700,
                  fontSize: '0.9rem', cursor: openaiKey.trim() ? 'pointer' : 'not-allowed',
                  opacity: openaiKey.trim() ? 1 : 0.5 }}>
                {keyStatus === 'testing' ? 'Validating…' : keyStatus === 'ok' ? '✓ Connected!' : 'Test & Continue →'}
              </button>
              <button onClick={() => setStep(2)}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,.08)',
                  color: '#475569', borderRadius: '0.5rem', padding: '0.8rem 1.25rem',
                  fontSize: '0.85rem', cursor: 'pointer' }}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Stripe */}
        {step === 2 && (
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '0.75rem', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem' }}>
              Connect Stripe
            </h2>
            <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              This is how we join AI costs to revenue. Without Stripe, you can see AI spend but not gross margins.
              We request <strong style={{ color: '#e2e8f0' }}>read-only</strong> access.
            </p>
            <button
              onClick={() => { window.location.href = '/api/ci/auth/stripe-connect'; }}
              style={{ width: '100%', background: '#635bff', color: '#fff', border: 'none',
                borderRadius: '0.5rem', padding: '0.8rem', fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
              Connect Stripe →
            </button>
            <button
              onClick={() => { setStripeSkipped(true); setStep(3); }}
              style={{ width: '100%', background: 'none', border: '1px solid rgba(255,255,255,.08)',
                color: '#475569', borderRadius: '0.5rem', padding: '0.8rem',
                fontSize: '0.85rem', cursor: 'pointer' }}>
              Skip — I&apos;ll add later
            </button>
            {stripeSkipped && (
              <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem', textAlign: 'center' }}>
                ⚠️ Without Stripe, gross margin data will show as N/A.
              </p>
            )}
          </div>
        )}

        {/* Step 3: SDK */}
        {step === 3 && (
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '0.75rem', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem' }}>
              Add the SDK to one endpoint
            </h2>
            <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Add <code style={{ background: 'rgba(99,102,241,.12)', color: '#a5b4fc',
                padding: '0.1rem 0.4rem', borderRadius: '0.3rem' }}>@runesignal.track</code> to
              your most expensive inference call. That&apos;s it.
            </p>

            <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.07)',
              borderRadius: '0.5rem', padding: '1rem 1.25rem', fontFamily: 'monospace',
              fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.9, marginBottom: '1.25rem',
              overflow: 'auto' }}>
              <div><span style={{ color: '#6366f1' }}># 1. Install</span></div>
              <div>pip install runesignal</div>
              <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#6366f1' }}># 2. Configure (once at startup)</span></div>
              <div>import runesignal</div>
              <div>runesignal.configure(api_key=<span style={{ color: '#10b981' }}>&quot;rs_live_YOUR_KEY&quot;</span>)</div>
              <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#6366f1' }}># 3. Decorate your LLM call</span></div>
              <div><span style={{ color: '#f97316' }}>@runesignal.track</span>(</div>
              <div style={{ paddingLeft: '1rem' }}>customer_id=user.id,</div>
              <div style={{ paddingLeft: '1rem' }}>feature_tag=<span style={{ color: '#10b981' }}>&quot;chat&quot;</span>,</div>
              <div style={{ paddingLeft: '1rem' }}>endpoint_id=<span style={{ color: '#10b981' }}>&quot;POST /chat&quot;</span>,</div>
              <div>)</div>
              <div><span style={{ color: '#818cf8' }}>async def</span> call_llm(prompt):</div>
              <div style={{ paddingLeft: '1rem' }}>return <span style={{ color: '#818cf8' }}>await</span> openai.chat.completions.create(...)</div>
            </div>

            <button onClick={() => setStep(4)}
              style={{ width: '100%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                border: 'none', borderRadius: '0.5rem', padding: '0.8rem', fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer' }}>
              Done — I&apos;ve added the SDK →
            </button>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div style={{ background: '#0d1117', border: '1px solid rgba(16,185,129,.2)',
            borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.75rem' }}>
              You&apos;re live!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              Within <strong style={{ color: '#e2e8f0' }}>24 hours</strong> of your first inference log,
              you&apos;ll receive an email showing your most margin-damaging customer.
              <br /><br />
              Your dashboard will populate as logs come in.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
              marginBottom: '1.5rem' }}>
              {[
                { icon: '📊', text: 'Customer margin table' },
                { icon: '🤖', text: 'AI spend by model' },
                { icon: '📈', text: 'Monthly trend chart' },
                { icon: '📧', text: 'First insight email in 24h' },
              ].map(f => (
                <div key={f.text} style={{ background: 'rgba(99,102,241,.06)',
                  border: '1px solid rgba(99,102,241,.12)', borderRadius: '0.5rem',
                  padding: '0.75rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                  {f.icon} {f.text}
                </div>
              ))}
            </div>
            <Link href="/ci"
              style={{ display: 'block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', padding: '0.875rem', borderRadius: '0.5rem', fontWeight: 700,
                textDecoration: 'none', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              Open dashboard →
            </Link>
            <Link href="/dashboard"
              style={{ fontSize: '0.8rem', color: '#334155', textDecoration: 'none' }}>
              Back to RuneSignal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

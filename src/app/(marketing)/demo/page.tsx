'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DemoPage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', jobTitle: '', company: '',
    email: '', phone: '', challenges: '', consent: false,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Submission failed');
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try emailing us at demo@runesignal.io');
    }
  };

  return (
    <>
      <style jsx global>{`
        .demo-page { min-height: calc(100vh - 72px); display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 860px) { .demo-page { grid-template-columns: 1fr; } .demo-left { display: none; } }

        .demo-left {
          background: linear-gradient(145deg, #064e3b 0%, #065f46 40%, #047857 80%, #059669 100%);
          padding: 4rem 3.5rem;
          display: flex; flex-direction: column; justify-content: center;
          position: relative; overflow: hidden;
        }
        .demo-left::before {
          content: '';
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='600' height='600' viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'%3E%3Cline x1='0' y1='0' x2='600' y2='600'/%3E%3Cline x1='150' y1='0' x2='600' y2='450'/%3E%3Cline x1='300' y1='0' x2='600' y2='300'/%3E%3Cline x1='450' y1='0' x2='600' y2='150'/%3E%3Cline x1='0' y1='150' x2='450' y2='600'/%3E%3Cline x1='0' y1='300' x2='300' y2='600'/%3E%3Cline x1='0' y1='450' x2='150' y2='600'/%3E%3C/g%3E%3C/svg%3E") center/cover;
          pointer-events: none;
        }
        .demo-left-content { position: relative; z-index: 1; }
        .demo-left h2 { font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 800; color: #fff; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1rem; }
        .demo-left-sub { font-size: 1rem; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 2.5rem; max-width: 400px; }
        .demo-bullets { list-style: none; display: flex; flex-direction: column; gap: 0.875rem; }
        .demo-bullets li { display: flex; align-items: flex-start; gap: 0.75rem; color: rgba(255,255,255,0.9); font-size: 0.9375rem; }
        .demo-bullet-icon { width: 20px; height: 20px; background: rgba(255,255,255,0.15); border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 2px; }

        .demo-right { background: var(--surface-1, #080812); padding: 4rem 3rem; display: flex; flex-direction: column; justify-content: center; }
        @media (max-width: 860px) { .demo-right { padding: 3rem 1.5rem; } }

        .demo-form-title { font-size: 1.5rem; font-weight: 700; color: var(--text-primary, #f8fafc); margin-bottom: 0.5rem; letter-spacing: -0.02em; }
        .demo-form-sub { font-size: 0.9rem; color: var(--text-secondary, #94a3b8); margin-bottom: 2rem; }

        .demo-form { display: flex; flex-direction: column; gap: 1rem; max-width: 480px; }
        .demo-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 500px) { .demo-row { grid-template-columns: 1fr; } }

        .demo-field { display: flex; flex-direction: column; gap: 0.375rem; }
        .demo-label { font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary, #94a3b8); }
        .demo-label .req { color: #10b981; margin-left: 2px; }
        .demo-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 0.625rem 0.875rem;
          font-size: 0.9rem;
          color: var(--text-primary, #f1f5f9);
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
        }
        .demo-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.12); }
        .demo-input::placeholder { color: rgba(148,163,184,0.5); }
        .demo-textarea { resize: vertical; min-height: 90px; }

        .demo-consent { display: flex; align-items: flex-start; gap: 0.75rem; }
        .demo-consent input[type=checkbox] { width: 16px; height: 16px; margin-top: 2px; accent-color: #10b981; flex-shrink: 0; }
        .demo-consent-label { font-size: 0.8rem; color: var(--text-secondary, #94a3b8); line-height: 1.5; }

        .demo-submit {
          background: #10b981; color: #fff; border: none; border-radius: 8px;
          padding: 0.8rem 1.5rem; font-size: 0.9375rem; font-weight: 600;
          cursor: pointer; transition: background 0.15s; width: 100%;
        }
        .demo-submit:hover { background: #059669; }
        .demo-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .demo-success { text-align: center; padding: 3rem 1rem; }
        .demo-success-icon { font-size: 3rem; margin-bottom: 1rem; }
        .demo-success h3 { font-size: 1.5rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.75rem; }
        .demo-success p { color: #94a3b8; font-size: 0.9375rem; line-height: 1.6; }
        .demo-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.875rem; color: #fca5a5; }
      `}</style>

      <div className="demo-page">
        {/* ── Left panel ── */}
        <div className="demo-left">
          <div className="demo-left-content">
            <h2>Help your teams govern AI everywhere.</h2>
            <p className="demo-left-sub">
              Book time with us to see how RuneSignal delivers the most
              comprehensive governance platform for enterprise AI agents.
            </p>
            <ul className="demo-bullets">
              {[
                'Agent inventory & non-human identity registry',
                'EU AI Act evidence, auto-generated from every decision',
                'Human-in-the-loop approvals with blast-radius scoring',
                'Real-time action firewall & anomaly detection',
                'Cryptographic audit trail (Ed25519-signed)',
                'SOC 2-ready compliance reporting in one click',
              ].map((item) => (
                <li key={item}>
                  <span className="demo-bullet-icon">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="demo-right">
          {status === 'success' ? (
            <div className="demo-success">
              <div className="demo-success-icon">✅</div>
              <h3>Request received!</h3>
              <p>
                Thanks — we&apos;ll be in touch within one business day to
                schedule your personalised RuneSignal demo.
              </p>
              <Link href="/" style={{ display: 'inline-block', marginTop: '1.5rem', color: '#10b981', textDecoration: 'none', fontSize: '0.9rem' }}>
                ← Back to home
              </Link>
            </div>
          ) : (
            <>
              <div className="demo-form-title">Schedule a demo</div>
              <div className="demo-form-sub">
                Fill in the form and we&apos;ll reach out within one business day.
              </div>

              <form className="demo-form" onSubmit={handleSubmit}>
                <div className="demo-row">
                  <div className="demo-field">
                    <label className="demo-label">First Name<span className="req">*</span></label>
                    <input className="demo-input" required value={form.firstName} onChange={set('firstName')} placeholder="Jane" />
                  </div>
                  <div className="demo-field">
                    <label className="demo-label">Last Name<span className="req">*</span></label>
                    <input className="demo-input" required value={form.lastName} onChange={set('lastName')} placeholder="Smith" />
                  </div>
                </div>

                <div className="demo-field">
                  <label className="demo-label">Job Title<span className="req">*</span></label>
                  <input className="demo-input" required value={form.jobTitle} onChange={set('jobTitle')} placeholder="CISO / AI Lead / CTO" />
                </div>

                <div className="demo-field">
                  <label className="demo-label">Company Name<span className="req">*</span></label>
                  <input className="demo-input" required value={form.company} onChange={set('company')} placeholder="Acme Corp" />
                </div>

                <div className="demo-field">
                  <label className="demo-label">Work Email<span className="req">*</span></label>
                  <input className="demo-input" type="email" required value={form.email} onChange={set('email')} placeholder="jane@acmecorp.com" />
                </div>

                <div className="demo-field">
                  <label className="demo-label">Phone</label>
                  <input className="demo-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
                </div>

                <div className="demo-field">
                  <label className="demo-label">What AI governance challenges are you working on?<span className="req">*</span></label>
                  <textarea
                    className="demo-input demo-textarea"
                    required
                    value={form.challenges}
                    onChange={set('challenges')}
                    placeholder="e.g. EU AI Act compliance, shadow AI discovery, agent audit trails..."
                  />
                </div>

                <div className="demo-consent">
                  <input type="checkbox" id="consent" checked={form.consent} onChange={set('consent')} />
                  <label htmlFor="consent" className="demo-consent-label">
                    I agree to receive communications from RuneSignal about product updates,
                    AI governance insights, and related events. You can unsubscribe at any time.
                  </label>
                </div>

                {status === 'error' && <div className="demo-error">{errorMsg}</div>}

                <button type="submit" className="demo-submit" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Submitting…' : 'Book my demo →'}
                </button>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary, #475569)', lineHeight: 1.5 }}>
                  By submitting this form, you acknowledge that RuneSignal will process your
                  personal information in accordance with our{' '}
                  <Link href="/legal/privacy" style={{ color: '#10b981', textDecoration: 'none' }}>Privacy Policy</Link>.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}

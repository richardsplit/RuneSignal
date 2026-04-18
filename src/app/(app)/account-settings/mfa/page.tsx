'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type MFAFactor = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
  created_at: string;
};

type EnrollStep = 'idle' | 'enrolling' | 'verifying' | 'done';

export default function MFAPage() {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<EnrollStep>('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadFactors();
  }, []);

  async function loadFactors() {
    setLoading(true);
    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      setFactors((data?.totp as unknown as MFAFactor[]) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load MFA factors');
    } finally {
      setLoading(false);
    }
  }

  async function startEnrollment() {
    setError('');
    setStep('enrolling');
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });
      if (enrollError) throw enrollError;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (err: any) {
      setError(err.message || 'Failed to start enrollment');
      setStep('idle');
    }
  }

  async function verifyAndActivate() {
    if (!verifyCode || verifyCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    setError('');
    setStep('verifying');
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      setSuccess('MFA enabled successfully! Your account is now protected.');
      setStep('done');
      setQrCode('');
      setSecret('');
      await loadFactors();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Check the code and try again.');
      setStep('enrolling');
    }
  }

  async function unenrollFactor(id: string, friendlyName?: string) {
    if (!confirm(`Remove MFA factor "${friendlyName || 'Authenticator App'}"? This will disable two-factor authentication.`)) return;
    setError('');
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (unenrollError) throw unenrollError;
      setSuccess('MFA factor removed.');
      await loadFactors();
    } catch (err: any) {
      setError(err.message || 'Failed to remove MFA factor');
    }
  }

  const verifiedFactors = factors.filter(f => f.status === 'verified');
  const isMFAEnabled = verifiedFactors.length > 0;

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Multi-Factor Authentication</h1>
        <p className="page-description">
          Add an extra layer of security to your RuneSignal account using an authenticator app.
        </p>
      </div>

      {error && <div className="callout callout-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="callout callout-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {/* Status Banner */}
      <div className={`callout ${isMFAEnabled ? 'callout-success' : 'callout-warning'}`} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{isMFAEnabled ? '🔐' : '⚠️'}</span>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>
            {isMFAEnabled ? 'MFA is Enabled' : 'MFA is Not Enabled'}
          </div>
          <div className="t-body-sm">
            {isMFAEnabled
              ? `${verifiedFactors.length} active authenticator(s) protecting your account`
              : 'We strongly recommend enabling MFA for governance platform access'}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p className="t-body-sm text-tertiary">Loading MFA settings…</p>
        </div>
      ) : (
        <>
          {/* Active factors */}
          {verifiedFactors.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="t-eyebrow" style={{ marginBottom: '0.75rem' }}>Active Authenticators</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {verifiedFactors.map(factor => (
                  <div key={factor.id} className="surface" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>📱</span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{factor.friendly_name || 'Authenticator App'}</div>
                        <div className="t-caption">Added {new Date(factor.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <button className="btn btn-danger" style={{ fontSize: '0.75rem' }} onClick={() => unenrollFactor(factor.id, factor.friendly_name)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Idle: set up */}
          {step === 'idle' && (
            <div className="surface" style={{ padding: '1.25rem' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {isMFAEnabled ? 'Add Another Authenticator' : 'Set Up Authenticator App'}
              </h2>
              <p className="t-body-sm text-secondary" style={{ marginBottom: '1rem' }}>
                Use apps like Google Authenticator, Authy, or 1Password to generate time-based one-time passwords.
              </p>
              <button className="btn btn-primary" onClick={startEnrollment}>
                {isMFAEnabled ? 'Add Authenticator' : 'Enable MFA'}
              </button>
            </div>
          )}

          {/* Enrolling: QR scan */}
          {step === 'enrolling' && qrCode && (
            <div className="surface" style={{ padding: '1.25rem' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Scan QR Code</h2>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <p className="t-body-sm text-secondary" style={{ marginBottom: '0.75rem' }}>Scan with your authenticator app:</p>
                  <div className="surface" style={{ padding: '0.75rem', display: 'inline-block', background: '#fff' }}>
                    {/^<svg[\s>]/i.test(qrCode) ? (
                      <div dangerouslySetInnerHTML={{ __html: qrCode }} style={{ width: 160, height: 160 }} />
                    ) : (
                      <img src={qrCode} alt="MFA QR Code" style={{ width: 160, height: 160 }} />
                    )}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <p className="t-body-sm text-secondary" style={{ marginBottom: '0.5rem' }}>Or enter this secret manually:</p>
                  <code className="t-mono" style={{ display: 'block', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', fontSize: '0.75rem', wordBreak: 'break-all', marginBottom: '1rem' }}>
                    {secret}
                  </code>
                  <p className="t-body-sm" style={{ marginBottom: '0.5rem' }}>Enter the 6-digit code from your app:</p>
                  <input
                    className="form-input"
                    type="text"
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    style={{ width: '100%', textAlign: 'center', fontSize: '1.25rem', fontFamily: 'monospace', letterSpacing: '0.25em', marginBottom: '0.75rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setStep('idle'); setQrCode(''); setSecret(''); setVerifyCode(''); }}>Cancel</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={verifyAndActivate} disabled={verifyCode.length !== 6}>Verify &amp; Activate</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verifying */}
          {step === 'verifying' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p className="t-body-sm text-tertiary">Verifying code…</p>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="callout callout-success" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>MFA Successfully Enabled</div>
              <div className="t-body-sm">Your account is now protected with two-factor authentication.</div>
              <button className="btn btn-ghost" style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }} onClick={() => setStep('idle')}>
                Add another authenticator
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

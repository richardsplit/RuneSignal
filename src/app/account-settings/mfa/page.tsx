'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type MFAFactor = {
  id: string;
  type: string;
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
      setFactors((data?.totp as MFAFactor[]) || []);
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
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Multi-Factor Authentication</h1>
        <p className="text-gray-500 mt-1">
          Add an extra layer of security to your TrustLayer account using an authenticator app.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>
      )}

      {/* Status Banner */}
      <div className={`mb-6 p-4 rounded-lg border ${isMFAEnabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isMFAEnabled ? '🔐' : '⚠️'}</span>
          <div>
            <div className={`font-semibold ${isMFAEnabled ? 'text-green-800' : 'text-yellow-800'}`}>
              {isMFAEnabled ? 'MFA is Enabled' : 'MFA is Not Enabled'}
            </div>
            <div className={`text-sm ${isMFAEnabled ? 'text-green-600' : 'text-yellow-600'}`}>
              {isMFAEnabled
                ? `${verifiedFactors.length} active authenticator(s) protecting your account`
                : 'We strongly recommend enabling MFA for governance platform access'}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading MFA settings...</div>
      ) : (
        <>
          {/* Active factors */}
          {verifiedFactors.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Authenticators</h2>
              <div className="space-y-2">
                {verifiedFactors.map(factor => (
                  <div key={factor.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📱</span>
                      <div>
                        <div className="font-medium text-gray-900">{factor.friendly_name || 'Authenticator App'}</div>
                        <div className="text-xs text-gray-500">Added {new Date(factor.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => unenrollFactor(factor.id, factor.friendly_name)}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enrollment flow */}
          {step === 'idle' && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-2">
                {isMFAEnabled ? 'Add Another Authenticator' : 'Set Up Authenticator App'}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Use apps like Google Authenticator, Authy, or 1Password to generate time-based one-time passwords.
              </p>
              <button
                onClick={startEnrollment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {isMFAEnabled ? 'Add Authenticator' : 'Enable MFA'}
              </button>
            </div>
          )}

          {step === 'enrolling' && qrCode && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Scan QR Code</h2>
              <div className="flex flex-col md:flex-row gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-3">Scan with your authenticator app:</div>
                  <div className="border border-gray-200 rounded-lg p-3 bg-white inline-block">
                    {qrCode.startsWith('<svg') ? (
                      <div dangerouslySetInnerHTML={{ __html: qrCode }} className="w-40 h-40" />
                    ) : (
                      <img src={qrCode} alt="MFA QR Code" className="w-40 h-40" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-2">Or enter this secret manually:</div>
                  <code className="block bg-gray-100 rounded px-3 py-2 text-sm font-mono break-all mb-4">
                    {secret}
                  </code>
                  <div className="text-sm text-gray-700 mb-2">Enter the 6-digit code from your app:</div>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setStep('idle'); setQrCode(''); setSecret(''); setVerifyCode(''); }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={verifyAndActivate}
                      disabled={verifyCode.length !== 6}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      Verify & Activate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'verifying' && (
            <div className="text-center py-8 text-gray-500">Verifying code...</div>
          )}

          {step === 'done' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-semibold text-green-800">MFA Successfully Enabled</div>
              <div className="text-sm text-green-600 mt-1">
                Your account is now protected with two-factor authentication.
              </div>
              <button
                onClick={() => setStep('idle')}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Add another authenticator
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

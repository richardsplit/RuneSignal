'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@lib/db/supabase';
import { useRouter } from 'next/navigation';

export default function MFAVerifyPage() {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.all?.find(f => f.factor_type === 'totp' && f.status === 'verified');

      if (!totpFactor) {
        throw new Error('No verified MFA factors found. Please contact support or retry login.');
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: code
      });

      if (verifyError) throw verifyError;

      // Success -> Redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'MFA verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #1a1a2e 0%, #0d0d1a 100%)',
      padding: '2rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '3rem 2.5rem',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <Image 
            src="/trustlayer-logo.svg" 
            alt="TrustLayer" 
            width={180} 
            height={45} 
            style={{ margin: '0 auto' }}
          />
        </div>

        <h1 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 700 }}>
          Second Verification
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Your account is protected by MFA. Please enter the verification code from your authenticator app to continue.
        </p>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--color-error-rose)', 
            color: 'var(--color-error-rose)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <input 
              type="text" 
              className="form-input" 
              placeholder="000000"
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.1)' }}
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', paddingTop: '0.8rem', paddingBottom: '0.8rem' }}
            disabled={isVerifying || code.length !== 6}
          >
            {isVerifying ? 'Verifying Identity...' : 'Verify & Continue'}
          </button>
        </form>

        <button 
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '2rem', cursor: 'pointer' }}
        >
          Cancel and Sign Out
        </button>
      </div>
    </div>
  );
}

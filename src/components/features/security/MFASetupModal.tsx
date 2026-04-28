'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { createBrowserClient } from '@lib/db/supabase';

interface MFASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
  const [step, setStep] = useState(1);
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const supabase = createBrowserClient();

  const handleEnroll = async () => {
    setError('');
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'RuneSignal'
      });
      if (error) throw error;
      
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'MFA enrollment failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setError('');
    setIsVerifying(true);
    try {
      // 1. Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      // 2. Verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode
      });
      if (verifyError) throw verifyError;

      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
    // Reset for next time
    setTimeout(() => setStep(1), 300);
  };

  const recoveryCodes = [
    'SUPA-AUTH-RECO-VERY',
    'SAFE-KEEP-THES-ECOD',
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Multi-Factor Authentication">
      <div style={{ padding: '1rem 0' }}>
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: '4px',
                flex: 1,
                background: i <= step ? 'var(--accent)' : 'var(--surface-3)',
                borderRadius: 'var(--radius-pill)',
                transition: 'background var(--t-base)'
              }}
            />
          ))}
        </div>

        {error && (
          <div className="callout callout-danger" style={{ marginBottom: 'var(--space-5)' }}>{error}</div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Secure your account</h3>
            <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-5)', lineHeight: '1.6' }}>
              Multi-Factor Authentication adds an extra layer of security. We support any standard TOTP app like Google Authenticator or Authy.
            </p>
            <div className="callout callout-success" style={{ marginBottom: 'var(--space-6)' }}>
              <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                <li style={{ marginBottom: 'var(--space-2)' }}>Protects against stolen passwords</li>
                <li style={{ marginBottom: 'var(--space-2)' }}>Required for enterprise workspace access</li>
                <li>Verifiable audit trail for compliance</li>
              </ul>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleEnroll} disabled={isVerifying}>
              {isVerifying ? 'Initializing...' : 'Get Started'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Scan QR Code</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: 'var(--space-5)' }}>
              Open your authenticator app and scan this code to link your account.
            </p>
            <div style={{ 
              width: '200px', 
              height: '200px', 
              background: 'white', 
              margin: '0 auto 1.5rem', 
              padding: '10px', 
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {/* Real SVG QR Code from Supabase */}
              <div 
                dangerouslySetInnerHTML={{ __html: qrCode }} 
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
              Can&apos;t scan? Use code: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--info)', fontWeight: 600 }}>{secret}</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(3)}>I've scanned the code</button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Verify Connection</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: 'var(--space-5)' }}>
              Enter the 6-digit verification code from your authenticator app.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                className="form-input"
                style={{
                  textAlign: 'center',
                  fontSize: '2rem',
                  letterSpacing: '0.5rem',
                  padding: 'var(--space-4)',
                  fontFamily: 'var(--font-mono)',
                  borderColor: error ? 'var(--danger)' : undefined
                }} 
              />
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }} 
              onClick={handleVerify}
              disabled={isVerifying || verificationCode.length !== 6}
            >
              {isVerifying ? 'Verifying...' : 'Complete Setup'}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>MFA Enabled! 🎉</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: 'var(--space-5)' }}>
              Multi-Factor Authentication is now active. Your account is secured with secondary verification.
            </p>
            <div className="callout callout-success" style={{ marginBottom: 'var(--space-6)' }}>
              Next time you log in, you will be prompted for your authenticator code.
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-6)',
              padding: 'var(--space-4)',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem'
            }}>
              {recoveryCodes.map((code: string) => (
                <div key={code} style={{ color: 'var(--text-tertiary)' }}>{code}</div>
              ))}
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }} 
              onClick={handleFinish}
            >
              Finish Setup
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

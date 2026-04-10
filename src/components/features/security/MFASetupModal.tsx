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
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              style={{ 
                height: '4px', 
                flex: 1, 
                background: i <= step ? 'var(--color-primary-emerald)' : 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                transition: 'all 0.3s'
              }} 
            />
          ))}
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--color-error-rose)', 
            color: 'var(--color-error-rose)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Secure your account</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Multi-Factor Authentication adds an extra layer of security. We support any standard TOTP app like Google Authenticator or Authy.
            </p>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', marginBottom: '2rem' }}>
              <ul style={{ color: 'var(--color-text-main)', fontSize: '0.9rem', paddingLeft: '1.2rem', margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}>Protects against stolen passwords</li>
                <li style={{ marginBottom: '0.5rem' }}>Required for enterprise workspace access</li>
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
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Open your authenticator app and scan this code to link your account.
            </p>
            <div style={{ 
              width: '200px', 
              height: '200px', 
              background: 'white', 
              margin: '0 auto 1.5rem', 
              padding: '10px', 
              borderRadius: '8px',
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
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
              Can't scan? Use code: <span style={{ fontFamily: 'monospace', color: 'var(--color-info-cyan)', fontWeight: 600 }}>{secret}</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(3)}>I've scanned the code</button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Verify Connection</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
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
                style={{ 
                  width: '100%', 
                  textAlign: 'center', 
                  fontSize: '2rem', 
                  letterSpacing: '0.5rem', 
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${error ? 'var(--color-error-rose)' : 'var(--border-glass)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-main)',
                  fontFamily: 'monospace'
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
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Multi-Factor Authentication is now active. Your account is secured with secondary verification.
            </p>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', margin: 0 }}>
                Next time you log in, you will be prompted for your authenticator code.
              </p>
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '0.75rem', 
              marginBottom: '2rem',
              padding: '1.25rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)',
              fontFamily: 'monospace',
              fontSize: '0.85rem'
            }}>
              {recoveryCodes.map((code: string) => (
                <div key={code} style={{ color: 'var(--color-text-muted)' }}>{code}</div>
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

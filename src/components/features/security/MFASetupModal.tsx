'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface MFASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const recoveryCodes = [
    'XXXX-XXXX-XXXX',
    'YYYY-YYYY-YYYY',
    'ZZZZ-ZZZZ-ZZZZ',
    'AAAA-BBBB-CCCC'
  ];

  const handleVerify = () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setIsVerifying(true);
    // Simulate API call
    setTimeout(() => {
      setIsVerifying(false);
      setStep(4);
    }, 1500);
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
    // Reset for next time
    setTimeout(() => setStep(1), 300);
  };

  const nextStep = () => setStep(prev => prev + 1);

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
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={nextStep}>Get Started</button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Scan QR Code</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Open your authenticator app and scan this code to link your account.
            </p>
            <div style={{ 
              width: '180px', 
              height: '180px', 
              background: 'white', 
              margin: '0 auto 1.5rem', 
              padding: '10px', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Simulated QR Code */}
              <div style={{ width: '100%', height: '100%', border: '4px solid #000', display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '1px' }}>
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} style={{ background: Math.random() > 0.5 ? '#000' : 'transparent' }} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
              Can't scan? Use code: <span style={{ fontFamily: 'monospace', color: 'var(--color-info-cyan)', fontWeight: 600 }}>T7S2-K8P1-J9N4-L2W0</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={nextStep}>I've scanned the code</button>
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
                  border: `1px solid ${error ? 'var(--color-warning-amber)' : 'var(--border-glass)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-main)',
                  fontFamily: 'monospace'
                }} 
              />
              {error && <p style={{ color: 'var(--color-warning-amber)', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>{error}</p>}
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
              Store these recovery codes in a safe place. They allow you to access your account if you lose your phone.
            </p>
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
              {recoveryCodes.map(code => (
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

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@lib/db/supabase';
import { useRouter } from 'next/navigation';

const BOOK_DEMO_URL = 'https://runesignal.com/demo';

export default function LoginPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      setIsAdmin(true);
    } else {
      window.location.replace(BOOK_DEMO_URL);
    }
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [ssoMode, setSsoMode] = useState(false);
  const [ssoDomain, setSsoDomain] = useState('');
  const router = useRouter();
  const supabase = createBrowserClient();

  if (!isAdmin) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Verification email sent! Check your inbox.');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'github' | 'google') => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `${provider} login is not enabled. Use email/password or SSO.`);
    }
  };

  const handleSSOLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithSSO({
        domain: ssoDomain,
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'SSO login failed. Verify your domain is configured.');
    } finally {
      setLoading(false);
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
            src="/runesignal-logo.svg" 
            alt="RuneSignal" 
            width={180} 
            height={45} 
            style={{ margin: '0 auto' }}
          />
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
            Enterprise Agent Governance Platform
          </p>
        </div>

        <h1 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '2rem', fontWeight: 700 }}>
          {mode === 'login' ? 'Welcome Back' : 'Get Started'}
        </h1>

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

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '0.5rem', paddingTop: '0.8rem', paddingBottom: '0.8rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>OR CONTINUE WITH</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          <button 
            onClick={() => handleSocialLogin('google')} 
            className="btn btn-outline" 
            style={{ flex: 1, fontSize: '0.85rem', paddingTop: '0.7rem', paddingBottom: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button 
            onClick={() => setSsoMode(v => !v)} 
            className={`btn ${ssoMode ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, fontSize: '0.85rem', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
          >
            SSO / SAML
          </button>
        </div>

        {ssoMode && (
          <form onSubmit={handleSSOLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Work Email Domain</label>
              <input
                type="text"
                className="form-input"
                placeholder="company.com"
                value={ssoDomain}
                onChange={e => setSsoDomain(e.target.value)}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                Enter your company domain to be redirected to your identity provider.
              </p>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
              disabled={loading || !ssoDomain}
            >
              {loading ? 'Redirecting...' : 'Continue with SSO'}
            </button>
          </form>
        )}

        <p style={{ marginTop: '2.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--color-primary-emerald)', 
              fontWeight: 600,
              marginLeft: '0.5rem',
              cursor: 'pointer'
            }}
          >
            {mode === 'login' ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}

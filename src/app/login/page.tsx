'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@lib/db/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const router = useRouter();
  const supabase = createBrowserClient();

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
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'github' | 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
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

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => handleSocialLogin('github')} 
            className="btn btn-outline" 
            style={{ flex: 1, fontSize: '0.85rem', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
          >
            GitHub
          </button>
          <button 
            onClick={() => handleSocialLogin('google')} 
            className="btn btn-outline" 
            style={{ flex: 1, fontSize: '0.85rem', paddingTop: '0.7rem', paddingBottom: '0.7rem' }}
          >
            Google
          </button>
        </div>

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

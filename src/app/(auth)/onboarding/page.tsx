'use client';

import React, { useState, useEffect } from 'react';
import { Wordmark } from '@/components/marketing/Wordmark';
import { createBrowserClient } from '@lib/db/supabase';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    };
    checkUser();
  }, [supabase, router]);

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Verify session first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delegate tenant + member creation to the API route (uses admin client → bypasses RLS)
      const res = await fetch('/api/v1/onboarding/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Workspace creation failed');

      // Refresh session so new app_metadata (tenant_id, role) is picked up
      await supabase.auth.refreshSession();

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Onboarding failed');
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
        maxWidth: '480px',
        padding: '3rem 2.5rem',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'center' }}>
          <Wordmark size={48} />
        </div>

        <h1 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 700 }}>
          Initialize Your Workspace
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          Welcome to RuneSignal. Please provide your company details to set up your secure governance environment.
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

        <form onSubmit={handleOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Company or Organization Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              minLength={3}
            />
          </div>

          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', marginBottom: '1rem' }}>
             <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'left', lineHeight: 1.5 }}>
               Your workspace will be initialized with a local **Corporate SOUL** and an immutable **Audit Ledger** for agentic governance.
             </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', paddingTop: '0.8rem', paddingBottom: '0.8rem' }}
            disabled={loading}
          >
            {loading ? 'Initializing Environment...' : 'Create Workspace'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          By creating a workspace, you agree to the RuneSignal Enterprise Governance Terms.
        </p>
      </div>
    </div>
  );
}

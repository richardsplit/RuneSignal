'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Create the tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: companyName, owner_id: user.id })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 2. Link user to tenant as owner
      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      // 3. Set admin role claim in JWT metadata (requires service-role, done via API route)
      await fetch('/api/v1/onboarding/set-admin-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, tenant_id: tenant.id }),
      });

      // 4. Success -> Redirect to dashboard
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
          Initialize Your Workspace
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          Welcome to TrustLayer. Please provide your company details to set up your secure governance environment.
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
          By creating a workspace, you agree to the TrustLayer Enterprise Governance Terms.
        </p>
      </div>
    </div>
  );
}

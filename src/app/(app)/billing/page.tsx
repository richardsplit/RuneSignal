'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';
import { useToast } from '@/components/ToastProvider';
import { createBrowserClient } from '@lib/db/supabase';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    description: 'Perfect for small teams and prototyping.',
    features: ['Up to 3 Agentic Workers', 'Standard Audit Logging (7 days)', 'Basic SLA Monitoring', 'Community Support'],
    priceId: null,
    buttonText: 'Current Plan',
    highlight: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$299',
    period: '/mo',
    description: 'Advanced governance for production agent fleets.',
    features: ['Unlimited agents', 'HITL Approval API + blast radius scoring', 'Shadow AI discovery', 'Slack / ServiceNow / Jira adapters', 'SDK + LangChain plugin', 'EU AI Act evidence reports', 'Priority support'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    buttonText: 'Upgrade to Pro',
    highlight: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'Hardened compliance for global operations.',
    features: ['Dedicated High-Availability Node', 'On-Premise GRC Integration', 'SOC2/HIPAA Readiness Pack', '24/7 Phone Support', 'White-Label Dashboards'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    buttonText: 'Contact Sales',
    highlight: false
  }
];

export default function BillingPage() {
  const { tenantId } = useTenant();
  const { showToast } = useToast();
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState({ monthly: 0, limit: 1000, percentage: 0 });
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchBillingStatus = async () => {
      if (!tenantId) return;
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('plan_tier, api_requests_monthly')
          .eq('id', tenantId)
          .single();
        
        if (data) {
          setCurrentTier(data.plan_tier);
          const limit = data.plan_tier === 'pro' ? 100000 : data.plan_tier === 'enterprise' ? 10000000 : 1000;
          const monthly = data.api_requests_monthly || 0;
          setUsage({
            monthly,
            limit,
            percentage: Math.min((monthly / limit) * 100, 100)
          });
        }
      } catch (err) {
        console.error('Failed to fetch billing status');
      }
    };
    fetchBillingStatus();
  }, [tenantId, supabase]);

  const handleUpgrade = async (priceId: string | null, planId: string) => {
    if (planId === 'starter' || (planId === 'free' && currentTier === 'free')) return;
    if (planId === currentTier) return;
    
    if (!priceId && planId === 'enterprise') {
       window.location.href = 'mailto:sales@runesignal.dev';
       return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Tenant-Id': tenantId || '',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        credentials: 'include',
        body: JSON.stringify({ priceId })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Failed to start checkout.', 'error');
      }
    } catch (err) {
      showToast('A network error occurred.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '0 2rem' }}>
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Subscription & Usage</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Manage your plan and monitor your real-time API consumption.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto', marginBottom: '4rem' }}>
        {PLANS.map((plan) => (
          <div 
            key={plan.id} 
            className={`glass-panel ${plan.highlight ? 'animate-pulse-subtle' : ''}`}
            style={{ 
              padding: '2.5rem', 
              display: 'flex', 
              flexDirection: 'column',
              position: 'relative',
              borderColor: plan.highlight ? 'var(--color-primary-emerald)' : 'var(--border-glass)',
              borderWidth: plan.highlight ? '2px' : '1px'
            }}
          >
            {plan.highlight && (
              <div style={{ 
                position: 'absolute', 
                top: '-0.75rem', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                background: 'var(--color-primary-emerald)', 
                color: 'white', 
                padding: '0.25rem 1rem', 
                borderRadius: '1rem', 
                fontSize: '0.75rem', 
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                Most Popular
              </div>
            )}
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>{plan.name}</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{plan.price}</span>
              {plan.period && <span style={{ color: 'var(--color-text-muted)' }}>{plan.period}</span>}
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6', minHeight: '3.2rem' }}>
              {plan.description}
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-primary-emerald)" strokeWidth="3">
                    <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <button 
              className={`btn ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={loading || (plan.id === 'starter' && currentTier === 'free') || plan.id === currentTier}
              onClick={() => handleUpgrade(plan.priceId || null, plan.id)}
            >
              {loading ? 'Processing...' : (plan.id === currentTier || (plan.id === 'starter' && currentTier === 'free') ? 'Active Plan' : plan.buttonText)}
            </button>
          </div>
        ))}
      </div>

      {/* Usage Metering Section */}
      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Monthly Consumption</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>API Governance requests for the current billing period.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{usage.monthly.toLocaleString()}</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}> / {currentTier === 'enterprise' ? '∞' : usage.limit.toLocaleString()} calls</span>
          </div>
        </div>

        <div style={{ 
          height: '12px', 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '6px', 
          overflow: 'hidden', 
          marginBottom: '1rem',
          border: '1px solid var(--border-glass)'
        }}>
          <div style={{ 
            width: `${usage.percentage}%`, 
            height: '100%', 
            background: usage.percentage > 90 ? '#ef4444' : 'var(--color-primary-emerald)',
            transition: 'width 1s ease-out',
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)'
          }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <span>Utilization: {usage.percentage.toFixed(1)}%</span>
          <span>Cycle resets in 14 days</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <p>All prices are in USD. Subscription is billed monthly and can be cancelled any time.</p>
        <p style={{ marginTop: '0.5rem' }}>Automated fine-tuning and compliance reports included in Pro/Enterprise.</p>
      </div>
    </div>
  );
}

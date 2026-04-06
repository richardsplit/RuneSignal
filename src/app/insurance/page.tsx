'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import FileClaimModal from '@/components/features/insurance/FileClaimModal';
import RiskProfilesTable from '@/components/features/insurance/RiskProfilesTable';
import ClaimsLedger from '@/components/features/insurance/ClaimsLedger';
import InsuranceMetrics from '@/components/features/insurance/InsuranceMetrics';
import { useTenant } from '@lib/contexts/TenantContext';

export default function InsuranceDashboard() {
  const { showToast } = useToast();
  const { tenantId, loading: tenantLoading } = useTenant();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);

  const fetchInsuranceData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [riskRes, claimsRes] = await Promise.all([
        fetch('/api/v1/insurance/risk', { headers: { 'X-Tenant-Id': tenantId } }),
        fetch('/api/v1/insurance/claims', { headers: { 'X-Tenant-Id': tenantId } })
      ]);

      if (riskRes.ok && claimsRes.ok) {
        setProfiles(await riskRes.json());
        setClaims(await claimsRes.json());
      } else {
        console.error('Failed to fetch insurance data:', riskRes.status, claimsRes.status);
        showToast('Failed to load insurance data.', 'error');
      }
    } catch (e) {
      console.error('Failed to fetch insurance data:', e);
      showToast('An error occurred while fetching data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchInsuranceData();
    } else if (!tenantLoading) {
      setLoading(false);
    }
  }, [tenantId, tenantLoading]);

  const getRiskColor = (score: number) => {
    if (score < 10) return 'var(--color-primary-emerald)';
    if (score < 50) return 'var(--color-info-cyan)';
    if (score < 80) return 'var(--color-accent-amber)';
    return 'var(--color-error-rose)';
  };

  const handleRecalculate = async () => {
    if (!tenantId) return;
    showToast('Triggering fleet-wide risk recalculation...', 'info');
    
    try {
      const res = await fetch('/api/v1/insurance/risk', {
        method: 'POST',
        headers: { 'X-Tenant-Id': tenantId }
      });
      if (res.ok) {
        showToast('Actuarial refresh complete.', 'success');
        fetchInsuranceData(); // Refresh data after recalculation
      } else {
        showToast('Risk calculation failed.', 'error');
      }
    } catch (e) {
      showToast('Risk calculation failed due to network error.', 'error');
      console.error('Risk recalculation failed:', e);
    }
  };

  // Metrics calculation
  const totalLiabilities = "$5,000,000"; // Based on policy limit
  const fleetAvgRisk = profiles.length > 0 
    ? Math.round(profiles.reduce((acc, p) => acc + p.risk_score, 0) / profiles.length) 
    : 0;
  
  const calculateTotalPremium = () => {
    const base = 500;
    const total = profiles.reduce((acc, p) => {
      let m = 1.0;
      if (p.risk_score > 10) m = 1.2;
      if (p.risk_score > 30) m = 1.5;
      if (p.risk_score > 60) m = 2.0;
      if (p.risk_score > 90) m = 3.0;
      return acc + (base * m);
    }, 0);
    return total.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p>Loading insurance data...</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Insurance Micro-OS</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Actuarial risk modeling, dynamic premiums, and liability coverage.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-outline"
              onClick={() => showToast('Opening Coverage Policy details (PDF)...')}
            >
              Coverage Policy
            </button>
            <button 
              className="btn btn-primary" 
              style={{ background: 'var(--color-info-cyan)', borderColor: 'var(--color-info-cyan)' }}
              onClick={() => setIsModalOpen(true)}
            >
              File Claim
            </button>
          </div>
        </div>

        <InsuranceMetrics 
          totalLiabilities="$5,000,000"
          fleetAvgRisk={42}
          monthlyPremium="$3,350"
          activeClaims={claims.length}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <RiskProfilesTable 
            profiles={profiles} 
            onRecalculate={handleRecalculate} 
            getRiskColor={getRiskColor} 
          />
          <ClaimsLedger claims={claims} />
        </div>
      </div>
      
      <FileClaimModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchInsuranceData()}
        profiles={profiles}
      />
    </>
  );
}

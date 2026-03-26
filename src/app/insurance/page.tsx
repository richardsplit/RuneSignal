'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import FileClaimModal from '@/components/features/insurance/FileClaimModal';
import RiskProfilesTable from '@/components/features/insurance/RiskProfilesTable';
import ClaimsLedger from '@/components/features/insurance/ClaimsLedger';
import InsuranceMetrics from '@/components/features/insurance/InsuranceMetrics';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const DEFAULT_PROFILES = [
  { id: 'agt-001', agent: 'InventoryManager', score: 0, violations: 0, hitl: 0, anomalies: 0, premium: '$500.00' },
  { id: 'agt-002', agent: 'ContractAnalyst', score: 25, violations: 2, hitl: 7, anomalies: 0, premium: '$600.00' },
  { id: 'agt-003', agent: 'SlackBot_Dev', score: 95, violations: 14, hitl: 2, anomalies: 1, premium: '$1,500.00' },
  { id: 'agt-004', agent: 'CustomerSupport', score: 45, violations: 4, hitl: 12, anomalies: 0, premium: '$750.00' },
];

const DEFAULT_CLAIMS = [
  { id: 'clm-8921', agent: 'SlackBot_Dev', type: 'Data Exfiltration Violation', impact: '$12,500', status: 'investigating', date: '2 days ago' }
];

export default function InsuranceDashboard() {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [profiles, setProfiles] = useLocalStorage<any[]>('trustlayer_insurance_profiles', DEFAULT_PROFILES);
  const [claims, setClaims] = useLocalStorage<any[]>('trustlayer_insurance_claims', DEFAULT_CLAIMS);

  const getRiskColor = (score: number) => {
    if (score < 10) return 'var(--color-primary-emerald)';
    if (score < 50) return 'var(--color-info-cyan)';
    if (score < 80) return 'var(--color-accent-amber)';
    return 'var(--color-error-rose)';
  };

  const handleRecalculate = () => {
    showToast('Triggering actuarial risk recalculation for entire fleet...');
    setProfiles(profiles.map(p => ({ ...p, score: Math.max(0, p.score - Math.floor(Math.random() * 5)) })));
  };

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
        onSuccess={(claim: any) => setClaims([claim, ...claims])}
      />
    </>
  );
}

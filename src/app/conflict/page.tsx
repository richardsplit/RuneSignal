'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import PolicyBuilderModal from '@/components/features/conflict/PolicyBuilderModal';
import IntentFeed from '@/components/features/conflict/IntentFeed';
import PolicyList from '@/components/features/conflict/PolicyList';
import ConflictMetrics from '@/components/features/conflict/ConflictMetrics';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const DEFAULT_INTENTS = [
  { id: 'int-992', agent: 'SDR_Bot', intent: 'Update billing address for Acme Corp', similarity: '0.94', status: 'queue', reason: 'Collision with FinanceBot intent' },
  { id: 'int-991', agent: 'SupportAgent', intent: 'Close ticket #4021', similarity: '0.12', status: 'allow', reason: 'No overlap detected' },
];

const DEFAULT_POLICIES = [
  { id: 'pol-001', name: 'FinancialGuard', description: 'Blocks any unauthorized wire transfer intents', category: 'Finance', action: 'block' },
  { id: 'pol-002', name: 'PII_Protector', description: 'Alerts if PII extraction is detected in intent', category: 'Privacy', action: 'alert' },
];

export default function ConflictDashboard() {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [activeIntents] = useLocalStorage<any[]>('trustlayer_intents', DEFAULT_INTENTS);
  const [policies, setPolicies] = useLocalStorage<any[]>('trustlayer_policies', DEFAULT_POLICIES);

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Agent Conflict Arbiter</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Semantic collision detection and real-time intent mediation.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-outline"
              onClick={() => showToast('Syncing global policy configuration to vector DB...')}
            >
              Policy Config
            </button>
            <button 
              className="btn btn-primary" 
              style={{ background: 'var(--color-accent-amber)', borderColor: 'var(--color-accent-amber)' }}
              onClick={() => setIsModalOpen(true)}
            >
              Add Policy
            </button>
          </div>
        </div>

        <ConflictMetrics 
          totalMediated="1,842"
          blockedConflicts={24}
          queuedConflicts={7}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <IntentFeed intents={activeIntents} />
          <PolicyList policies={policies} />
        </div>
      </div>
      <PolicyBuilderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={(policy: any) => setPolicies([policy, ...policies])}
      />
    </>
  );
}

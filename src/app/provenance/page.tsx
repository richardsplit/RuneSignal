'use client';

import React, { useState } from 'react';
import CertificateModal from '@/components/features/provenance/CertificateModal';
import EvidenceTable from '@/components/features/provenance/EvidenceTable';
import ProvenanceMetrics from '@/components/features/provenance/ProvenanceMetrics';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const DEFAULT_CERTS = [
  { id: '1a3f-8c2d', agent: 'LegalReviewBot', tags: ['contract-review', 'eu-ai-act'], hash: 'f4e2...89a1', time: '10 mins ago', status: 'verified' },
  { id: '7b2e-9d1a', agent: 'CodeCopilot', tags: ['code-gen'], hash: 'a1b2...3c4d', time: '1 hour ago', status: 'verified' },
  { id: '4d5c-2e8f', agent: 'SupportAgent', tags: ['customer-ticket'], hash: 'e5f6...7a8b', time: '3 hours ago', status: 'verified' },
];

export default function ProvenanceDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [certs, setCerts] = useLocalStorage<any[]>('trustlayer_certs', DEFAULT_CERTS);

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>AI Output Provenance</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Cryptographically verify LLM outputs against the immutable ledger.</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsModalOpen(true)}
          >
            Generate Certificate
          </button>
        </div>

        <ProvenanceMetrics 
          totalCerts={14201 + certs.length}
          detectionRate="100%"
          anomalies={2}
        />

        <EvidenceTable certs={certs} />
      </div>

      <CertificateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(cert: any) => setCerts([cert, ...certs])}
      />
    </>
  );
}

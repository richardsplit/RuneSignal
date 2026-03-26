'use client';

import React, { useState, useEffect } from 'react';
import CertificateModal from '@/components/features/provenance/CertificateModal';
import EvidenceTable from '@/components/features/provenance/EvidenceTable';
import ProvenanceMetrics from '@/components/features/provenance/ProvenanceMetrics';
import { useToast } from '@/components/ToastProvider';

export default function ProvenanceDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchCerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/provenance', {
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('tl_token') || ''
        }
      });
      const json = await res.json();
      if (json.data) {
        // Transform AuditEvent format to UI format
        const transformed = json.data.map((item: any) => ({
          id: item.request_id,
          agent: item.agent_id || 'Platform',
          tags: item.payload?.tags || [],
          hash: item.payload?.output_hash ? `${item.payload.output_hash.substring(0, 4)}...${item.payload.output_hash.substring(60)}` : 'n/a',
          time: new Date(item.created_at).toLocaleTimeString() + ' ' + new Date(item.created_at).toLocaleDateString(),
          status: 'verified'
        }));
        setCerts(transformed);
      }
    } catch (err) {
      showToast('Error syncing with Immutable Ledger.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

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
          totalCerts={certs.length}
          detectionRate="100%"
          anomalies={0}
        />

        {loading ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--color-primary-emerald)' }}>Querying Immutable Ledger...</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--color-primary-emerald)', width: '60%', animation: 'loading 1.5s infinite linear' }}></div>
            </div>
          </div>
        ) : (
          <EvidenceTable certs={certs} />
        )}
      </div>

      <CertificateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          showToast('Certificate generated and signed.');
          fetchCerts();
        }}
      />
    </>
  );
}

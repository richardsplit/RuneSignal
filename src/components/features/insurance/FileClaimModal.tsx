import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ToastProvider';

interface FileClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (claim: any) => void;
}

export default function FileClaimModal({ isOpen, onClose, onSuccess }: FileClaimModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    agentId: 'agt-003',
    incidentType: 'data-exfiltration',
    impactEstimate: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API logic to file a claim
    setTimeout(() => {
      showToast(`Claim for agent ${formData.agentId} submitted for review.`, 'success');
      
      let typeLabel = formData.incidentType;
      if (typeLabel === 'data-exfiltration') typeLabel = 'Data Exfiltration Violation';
      if (typeLabel === 'fin-loss') typeLabel = 'Unauthorized Financial Loss';
      if (typeLabel === 'pii-leak') typeLabel = 'PII Leakage';
      if (typeLabel === 'sla-breach') typeLabel = 'Critical SLA Breach';

      if (onSuccess) {
        onSuccess({
          id: `clm-${Math.floor(Math.random() * 10000)}`,
          agent: formData.agentId === 'agt-001' ? 'InventoryManager' : 
                 formData.agentId === 'agt-002' ? 'ContractAnalyst' : 
                 formData.agentId === 'agt-003' ? 'SlackBot_Dev' : 'CustomerSupport',
          type: typeLabel,
          impact: `$${parseInt(formData.impactEstimate || '0').toLocaleString()}.00`,
          status: 'under review',
          date: 'just now'
        });
      }

      setFormData({ agentId: 'agt-003', incidentType: 'data-exfiltration', impactEstimate: '', description: '' });
      setIsSubmitting(false);
      onClose();
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File Insurance Claim">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="agentId">Involved Agent</label>
          <select 
            id="agentId"
            className="form-input" 
            style={{ appearance: 'none' }}
            value={formData.agentId}
            onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
          >
            <option value="agt-001">InventoryManager (agt-001)</option>
            <option value="agt-002">ContractAnalyst (agt-002)</option>
            <option value="agt-003">SlackBot_Dev (agt-003)</option>
            <option value="agt-004">CustomerSupport (agt-004)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="incidentType">Incident Type</label>
          <select 
            id="incidentType"
            className="form-input" 
            style={{ appearance: 'none' }}
            value={formData.incidentType}
            onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
          >
            <option value="data-exfiltration">Data Exfiltration</option>
            <option value="fin-loss">Unauthorized Financial Loss</option>
            <option value="pii-leak">PII Leakage</option>
            <option value="sla-breach">Critical SLA Breach</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="impactEstimate">Estimated Financial Impact ($)</label>
          <input 
            type="number" 
            id="impactEstimate"
            className="form-input" 
            placeholder="e.g. 15000"
            required
            value={formData.impactEstimate}
            onChange={(e) => setFormData({ ...formData, impactEstimate: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">Incident Description</label>
          <textarea 
            id="description"
            className="form-input" 
            rows={3}
            placeholder="Detail the failure scenario..."
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

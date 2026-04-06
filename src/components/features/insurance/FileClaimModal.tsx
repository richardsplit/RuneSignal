import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ToastProvider';
import { useTenant } from '@lib/contexts/TenantContext';

interface FileClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (claim: any) => void;
  profiles: any[];
}

export default function FileClaimModal({ isOpen, onClose, onSuccess, profiles }: FileClaimModalProps) {
  const { showToast } = useToast();
  const { tenantId } = useTenant();
  const [formData, setFormData] = useState({
    agentId: profiles[0]?.agent_id || '',
    incidentType: 'data-exfiltration',
    impactEstimate: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      showToast('No active tenant context found.', 'error');
      return;
    }
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/v1/insurance/claims', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId 
        },
        body: JSON.stringify({
          agent_id: formData.agentId,
          incident_type: formData.incidentType,
          financial_impact: parseFloat(formData.impactEstimate),
          description: formData.description
        })
      });

      if (res.ok) {
        const claim = await res.json();
        showToast(`Claim filed successfully.`, 'success');
        if (onSuccess) onSuccess(claim);
        setFormData({ agentId: profiles[0]?.agent_id || '', incidentType: 'data-exfiltration', impactEstimate: '', description: '' });
        onClose();
      } else {
        const err = await res.json();
        showToast(`Failed to file claim: ${err.error}`, 'error');
      }
    } catch (e) {
      showToast('Network error filing claim', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
            <option value="" disabled>Select an agent...</option>
            {profiles.map(p => (
              <option key={p.agent_id} value={p.agent_id}>Agent {p.agent_id.split('-')[0]}</option>
            ))}
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

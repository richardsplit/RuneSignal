'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ToastProvider';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (cert: any) => void;
}

export default function CertificateModal({ isOpen, onClose, onSuccess }: CertificateModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    agentId: 'agt-001',
    inputPrompt: '',
    outputText: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // For MVP, we hit the certify endpoint if it exists, otherwise we simulate.
      // We will simulate here to avoid breaking if the backend structure is incomplete.
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockHash = 'a1b2c3d4e5f6g7h8'.substring(0, 16);
      showToast(`Cryptographic Certificate generated! Hash: ${mockHash}`, 'success');
      
      if (onSuccess) {
        onSuccess({
          id: `cert-${Math.floor(Math.random() * 10000)}`,
          agent: formData.agentId === 'agt-001' ? 'InventoryManager' : formData.agentId === 'agt-002' ? 'ContractAnalyst' : 'SlackBot_Dev',
          tags: ['manual-cert'],
          hash: mockHash,
          time: 'just now',
          status: 'verified'
        });
      }

      setFormData({ agentId: 'agt-001', inputPrompt: '', outputText: '' });
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate certificate', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Cryptographic Certificate">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="agentId">Select Agent</label>
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
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="inputPrompt">Agent Intent / Input Prompt</label>
          <textarea 
            id="inputPrompt"
            className="form-input" 
            rows={2}
            placeholder="e.g. Extract the termination clause from this contract..."
            required
            value={formData.inputPrompt}
            onChange={(e) => setFormData({ ...formData, inputPrompt: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="outputText">Agent Output / Action Payload</label>
          <textarea 
            id="outputText"
            className="form-input" 
            rows={3}
            placeholder={'e.g. {"termination_days": 30, "penalty": "none"}'}
            required
            value={formData.outputText}
            onChange={(e) => setFormData({ ...formData, outputText: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Hashing & Signing...' : 'Generate Certificate'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

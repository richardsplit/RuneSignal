'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ToastProvider';

interface PolicyBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (policy: any) => void;
}

export default function PolicyBuilderModal({ isOpen, onClose, onSuccess }: PolicyBuilderModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    intentDescription: '',
    action: 'block',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API logic to vector-encode the intent description and save
    setTimeout(() => {
      showToast(`Policy '${formData.name}' created and vectorized.`, 'success');
      
      if (onSuccess) {
        onSuccess({
          id: `pol-${Math.floor(Math.random() * 1000)}`,
          name: formData.name,
          description: formData.intentDescription,
          category: 'Custom',
          action: formData.action
        });
      }

      setFormData({ name: '', intentDescription: '', action: 'block' });
      setIsSubmitting(false);
      onClose();
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Define Semantic Policy">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="policyName">Policy Rule Name</label>
          <input 
            type="text" 
            id="policyName"
            className="form-input" 
            placeholder="e.g. Prevent Large Wire Transfers"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="intentDesc">Semantic Intent Description</label>
          <textarea 
            id="intentDesc"
            className="form-input" 
            rows={3}
            placeholder="Describe the condition in natural language. e.g. 'Initiating a wire transfer or payment exceeding $10,000'"
            required
            value={formData.intentDescription}
            onChange={(e) => setFormData({ ...formData, intentDescription: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="policyAction">Enforcement Action</label>
          <select 
            id="policyAction"
            className="form-input" 
            style={{ appearance: 'none' }}
            value={formData.action}
            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
          >
            <option value="block">BLOCK: Immediately halt agent execution</option>
            <option value="queue">QUEUE: Route to Human-in-the-Loop approval</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ background: 'var(--success)' }} disabled={isSubmitting}>
            {isSubmitting ? 'Generating Embeddings...' : 'Create Policy'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

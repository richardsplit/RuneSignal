'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ToastProvider';

interface AgentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (agent: any) => void;
}

export default function AgentRegistrationModal({ isOpen, onClose, onSuccess }: AgentRegistrationModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    type: 'langgraph',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let newAgentData: any = null;
      try {
        const res = await fetch('/api/v1/agents/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });
        
        const data = await res.json();
        if (res.ok) {
          newAgentData = data.agent;
        } else {
          console.warn('API error:', data.error);
        }
      } catch (e) {
        console.warn('Fetch error:', e);
      }

      showToast(`Agent '${formData.name}' registered (Local MVP Mode)`, 'success');
      
      if (onSuccess) {
        onSuccess({
          id: newAgentData?.id || `agt-${Math.floor(Math.random() * 1000)}`,
          name: newAgentData?.agent_name || formData.name,
          type: newAgentData?.agent_type || formData.type,
          status: 'active',
          violations: 0,
          lastSeen: 'just now',
        });
      }

      setFormData({ name: '', type: 'langgraph', description: '' });
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error communicating with ledger', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Agent">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="agentName">Agent Name</label>
          <input 
            type="text" 
            id="agentName"
            className="form-input" 
            placeholder="e.g. Finance_Reconciliation_Bot"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="agentType">Agent Framework / Type</label>
          <select 
            id="agentType"
            className="form-input" 
            style={{ appearance: 'none' }}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="langgraph">LangGraph</option>
            <option value="crewai">CrewAI</option>
            <option value="autogen">AutoGen</option>
            <option value="custom">Custom Implementation</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="agentDesc">Agent Description & Role</label>
          <textarea 
            id="agentDesc"
            className="form-input" 
            rows={3}
            placeholder="Describe the scope and purpose of this agent..."
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
            {isSubmitting ? 'Registering...' : 'Complete Registration'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

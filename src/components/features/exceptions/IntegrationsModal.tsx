'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ToastProvider';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntegrationsModal({ isOpen, onClose }: IntegrationsModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    slackWebhook: 'https://hooks.slack.com/services/T0000/B0000/XXXX',
    jiraUrl: '',
    pagerDutyKey: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API persistence
    setTimeout(() => {
      showToast('Integrations updated successfully. Future exceptions will sync to these channels.', 'success');
      setIsSubmitting(false);
      onClose();
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure HITL Integrations">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="slackWebhook">Slack Webhook URL (Primary Routing)</label>
          <input 
            type="url" 
            id="slackWebhook"
            className="form-input" 
            placeholder="https://hooks.slack.com/services/..."
            required
            value={formData.slackWebhook}
            onChange={(e) => setFormData({ ...formData, slackWebhook: e.target.value })}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Used for immediate approval routing to #security-ops</p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="jiraUrl">Jira Project Webhook (SLA Tracking)</label>
          <input 
            type="url" 
            id="jiraUrl"
            className="form-input" 
            placeholder="https://your-domain.atlassian.net/..."
            value={formData.jiraUrl}
            onChange={(e) => setFormData({ ...formData, jiraUrl: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pagerDutyKey">PagerDuty Routing Key (Critical SLAs)</label>
          <input 
            type="text" 
            id="pagerDutyKey"
            className="form-input" 
            placeholder="e.g. R0UT1NGK3Y..."
            value={formData.pagerDutyKey}
            onChange={(e) => setFormData({ ...formData, pagerDutyKey: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ background: 'var(--color-info-cyan)', borderColor: 'var(--color-info-cyan)' }} disabled={isSubmitting}>
            {isSubmitting ? 'Saving Configuration...' : 'Save Integrations'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

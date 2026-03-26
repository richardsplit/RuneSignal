'use client';

import React, { useState } from 'react';
import Modal from '../../ui/Modal';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (workspace: any) => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('Pro');
  const [region, setRegion] = useState('us-east-1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newWorkspace = {
      id: `org-${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      plan,
      region,
      status: 'ACTIVE',
      agents: 0
    };
    onSuccess(newWorkspace);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Workspace">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
        <div>
          <label className="form-label">Workspace Name</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. Data Analytics Lab" 
            required 
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label">Plan Type</label>
            <select 
              className="form-input" 
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              style={{ width: '100%', background: 'var(--color-bg-main)' }}
            >
              <option value="Starter">Starter</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="form-label">Region</label>
            <select 
              className="form-input" 
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{ width: '100%', background: 'var(--color-bg-main)' }}
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="eu-central-1">EU (Frankfurt)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
            </select>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
            <strong style={{ color: 'var(--color-primary-emerald)' }}>Pro Tip:</strong> Workspaces allow you to isolate agent fleets and billing across different environments or departments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Workspace</button>
        </div>
      </form>
    </Modal>
  );
}

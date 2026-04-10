'use client';

import React, { useState } from 'react';
import Modal from '../../ui/Modal';

interface ManageTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
}

export default function ManageTeamModal({ isOpen, onClose, workspaceName }: ManageTeamModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [members, setMembers] = useState([
    { name: 'Admin User', email: 'admin@runesignal.dev', role: 'Owner', status: 'Active' },
    { name: 'Sarah Chen', email: 's.chen@runesignal.dev', role: 'Member', status: 'Active' },
    { name: 'Alex Rivera', email: 'a.rivera@runesignal.dev', role: 'Viewer', status: 'Pending' }
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setMembers([...members, { name: email.split('@')[0], email, role, status: 'Pending' }]);
    setEmail('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Team - ${workspaceName}`}>
      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Invite Form */}
        <div>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Invite New Member</h3>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              type="email" 
              className="form-input" 
              placeholder="Email address" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flex: 2 }}
            />
            <select 
              className="form-input" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ flex: 1, background: 'var(--color-bg-main)' }}
            >
              <option value="Member">Member</option>
              <option value="Owner">Owner</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button type="submit" className="btn btn-primary">Invite</button>
          </form>
        </div>

        {/* Member List */}
        <div>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Active Members</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {members.map((member, i) => (
              <div key={i} className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{member.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{member.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-emerald)', fontWeight: 600 }}>{member.role}</span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '0.1rem 0.4rem', 
                    background: member.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: member.status === 'Active' ? 'var(--color-primary-emerald)' : 'var(--color-warning-amber)',
                    borderRadius: '4px'
                  }}>
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-outline" onClick={onClose} style={{ width: '100%' }}>Done</button>
      </div>
    </Modal>
  );
}

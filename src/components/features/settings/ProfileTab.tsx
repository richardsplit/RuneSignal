'use client';

import React, { useState } from 'react';

interface ProfileTabProps {
  profile: { fullName: string; email: string; role: string };
  setProfile: (profile: any) => void;
  onSave: () => void;
  isSaving: boolean;
}

const MOCK_TEAMS = [
  { id: 't1', name: 'AI Governance', role: 'Admin', members: 6 },
  { id: 't2', name: 'Compliance Engineering', role: 'Member', members: 12 },
];

const MOCK_WORKSPACES = [
  { id: 'ws1', name: 'ACME Corp — Production', plan: 'Enterprise', current: true },
  { id: 'ws2', name: 'ACME Corp — Staging', plan: 'Team', current: false },
];

export default function ProfileTab({ profile, setProfile, onSave, isSaving }: ProfileTabProps) {
  const [department, setDepartment] = useState('Engineering');
  const [timezone, setTimezone] = useState('Europe/Sofia');

  const initials = profile.fullName
    ? profile.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : profile.email.slice(0, 2).toUpperCase();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Profile Information ── */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
          Profile Information
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--accent-dim)',
            border: '2px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              {profile.fullName || 'Set your name'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '0.125rem' }}>
              {profile.email}
            </div>
            <span className="badge badge-neutral" style={{ marginTop: '0.375rem' }}>{profile.role}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: 560 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={profile.fullName}
              onChange={e => setProfile({ ...profile, fullName: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" defaultValue={profile.email} disabled style={{ opacity: 0.6 }} />
            <p className="t-caption" style={{ marginTop: '0.35rem' }}>Contact support to change your email address.</p>
          </div>
          <div>
            <label className="form-label">Department</label>
            <input
              type="text"
              className="form-input"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
            />
          </div>
          <div>
            <label className="form-label">Timezone</label>
            <select className="form-input" value={timezone} onChange={e => setTimezone(e.target.value)}>
              {['UTC', 'Europe/London', 'Europe/Sofia', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Role</label>
            <input type="text" className="form-input" defaultValue={profile.role} disabled style={{ opacity: 0.6 }} />
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: '1.25rem' }}
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </section>

      <div style={{ height: 1, background: 'var(--border-subtle)' }} />

      {/* ── Teams ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Teams</h2>
          <button className="btn btn-ghost btn-sm">Create Team</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {MOCK_TEAMS.map(team => (
            <div key={team.id} className="surface" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{team.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{team.members} members</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={`badge ${team.role === 'Admin' ? 'badge-warning' : 'badge-neutral'}`}>{team.role}</span>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>Manage</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: 'var(--border-subtle)' }} />

      {/* ── Workspaces ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Workspaces</h2>
          <button className="btn btn-ghost btn-sm">New Workspace</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {MOCK_WORKSPACES.map(ws => (
            <div key={ws.id} className="surface" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', border: ws.current ? '1px solid var(--accent-border)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                {ws.current && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{ws.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{ws.plan} plan</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {ws.current
                  ? <span className="badge badge-success">Current</span>
                  : <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>Switch</button>
                }
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

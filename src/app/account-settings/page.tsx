import React from 'react';

export default function AccountSettingsPage() {
  return (
    <div style={{ padding: '0 2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Account Settings</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Manage your personal profile, security preferences, and API keys.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3fr', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', alignSelf: 'start', position: 'sticky', top: '2rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li><a href="#profile" style={{ color: 'var(--color-primary-emerald)', textDecoration: 'none', fontSize: '0.9rem' }}>Profile Information</a></li>
            <li><a href="#security" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Security & MFA</a></li>
            <li><a href="#apikeys" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Developer API Keys</a></li>
            <li><a href="#notifications" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Notifications</a></li>
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <section id="profile" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>Profile Information</h2>
            
            <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '500px' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Full Name</label>
                <input type="text" className="form-input" defaultValue="Admin User" style={{ width: '100%' }} />
              </div>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email Address</label>
                <input type="email" className="form-input" defaultValue="admin@trustlayer.dev" disabled style={{ width: '100%', opacity: 0.7 }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Contact support to change your email address.</p>
              </div>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Role</label>
                <input type="text" className="form-input" defaultValue="Platform Superadmin" disabled style={{ width: '100%', opacity: 0.7 }} />
              </div>
              <button className="btn btn-primary" style={{ width: 'max-content' }}>Save Changes</button>
            </div>
          </section>

          <section id="security">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-main)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>Security</h2>
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Multi-Factor Authentication</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Secure your account with an additional verification step.</p>
                </div>
                <button className="btn btn-outline">Enable MFA</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';
import { useToast } from '@/components/ToastProvider';
import Modal from '@/components/ui/Modal';

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export default function ApiKeysTab() {
  const { tenantId } = useTenant();
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ key: string, name: string } | null>(null);

  const fetchKeys = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/keys', {
        headers: { 'X-Tenant-Id': tenantId }
      });
      if (res.ok) {
        setKeys(await res.json());
      }
    } catch (err) {
      showToast('Failed to fetch API keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [tenantId]);

  const handleGenerate = async () => {
    const name = prompt('Enter a name for this API key:');
    if (!name) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId || '' },
        body: JSON.stringify({ name })
      });
      
      if (res.ok) {
        const data = await res.json();
        setNewKeyData({ key: data.key, name: data.name });
        fetchKeys();
        showToast('API key generated successfully.', 'success');
      } else {
        const err = await res.json();
        showToast(`Failed: ${err.error}`, 'error');
      }
    } catch (err) {
      showToast('Network error generating key', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action is irreversible.')) return;

    try {
      const res = await fetch(`/api/v1/keys?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('API key revoked.', 'info');
        fetchKeys();
      } else {
        showToast('Failed to revoke key.', 'error');
      }
    } catch (err) {
      showToast('Network error revoking key', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="animate-fade-in">
      <h2 className="t-h3" style={{ marginBottom: 'var(--space-3)' }}>Developer API Keys</h2>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-8)', fontSize: '0.9rem' }}>Use these keys to authenticate your AI agents with the RuneSignal SDK.</p>
      
      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        {loading ? (
          <p style={{ color: 'var(--text-tertiary)' }}>Loading keys...</p>
        ) : keys.map(k => (
          <div key={k.id} className="surface" style={{ padding: 'var(--space-5)', borderLeft: '3px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{k.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: '0.125rem' }}>
                  {k.id.split('-')[0]}...
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)' }}
                onClick={() => handleRevoke(k.id)}
              >
                Revoke
              </button>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-6)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
              <span>Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        ))}
        {!loading && keys.length === 0 && (
          <div className="empty-state">
            <p className="empty-state-title">No API keys yet</p>
            <p className="empty-state-body">Generate a key to authenticate your AI agents with the RuneSignal SDK.</p>
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate New API Key'}
      </button>

      {/* New Key Display Modal */}
      <Modal 
        isOpen={!!newKeyData} 
        onClose={() => setNewKeyData(null)} 
        title="Your New API Key"
      >
        <div style={{ padding: '1rem 0' }}>
          <div className="callout callout-warning" style={{ marginBottom: 'var(--space-6)' }}>
            <strong>Important:</strong> Copy this key now. This is the only time it will be shown.
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <label className="form-label">Key Name</label>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>{newKeyData?.name}</div>
            
            <label className="form-label">API Key Secret</label>
            <div style={{ 
              display: 'flex', 
              gap: 'var(--space-2)',
              background: 'var(--bg-base)', 
              padding: 'var(--space-3) var(--space-4)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              color: 'var(--accent)',
              wordBreak: 'break-all',
              alignItems: 'flex-start'
            }}>
              <span style={{ flex: 1 }}>{newKeyData?.key}</span>
              <button 
                onClick={() => copyToClipboard(newKeyData?.key || '')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)', flexShrink: 0 }}
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setNewKeyData(null)}>
            I've Securely Stored the Key
          </button>
        </div>
      </Modal>
    </div>
  );
}


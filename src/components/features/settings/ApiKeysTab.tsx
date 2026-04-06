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
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>Developer API Keys</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Use these keys to authenticate your AI agents with the TrustLayer SDK.</p>
      
      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading keys...</p>
        ) : keys.map(k => (
          <div key={k.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary-emerald)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{k.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  ID: {k.id.split('-')[0]}...
                </div>
              </div>
              <button 
                className="btn btn-outline" 
                style={{ fontSize: '0.75rem', color: 'var(--color-error-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }} 
                onClick={() => handleRevoke(k.id)}
              >
                Revoke Key
              </button>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <div>Created: {new Date(k.created_at).toLocaleDateString()}</div>
              <div>Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</div>
            </div>
          </div>
        ))}
        {!loading && keys.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-md)' }}>
            No active API keys found. Generate one to get started.
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
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid var(--color-accent-amber)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1.5rem',
            color: 'var(--color-accent-amber)',
            fontSize: '0.85rem'
          }}>
            <strong>⚠️ Important:</strong> Copy this key now! This is the ONLY time we will show it. If you lose it, you will have to generate a new one.
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <label className="form-label">Key Name</label>
            <div style={{ color: 'var(--color-text-main)', fontWeight: 600, marginBottom: '1rem' }}>{newKeyData?.name}</div>
            
            <label className="form-label">API Key Secret</label>
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              background: 'rgba(0,0,0,0.2)', 
              padding: '0.75rem 1rem', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-glass)',
              fontFamily: 'monospace',
              fontSize: '1rem',
              color: 'var(--color-primary-emerald)',
              wordBreak: 'break-all'
            }}>
              {newKeyData?.key}
              <button 
                onClick={() => copyToClipboard(newKeyData?.key || '')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-muted)' }}
                title="Copy to clipboard"
              >
                📋
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

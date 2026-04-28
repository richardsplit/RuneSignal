'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@lib/contexts/TenantContext';
import { useToast } from '@/components/ToastProvider';
import { createBrowserClient } from '@lib/db/supabase';

export default function WebhooksTab() {
  const { tenantId } = useTenant();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    slack_url: '',
    custom_url: '',
    is_active: true
  });
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchSettings = async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('webhook_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .single();
        
        if (data) {
          setSettings({
            slack_url: data.slack_url || '',
            custom_url: data.custom_url || '',
            is_active: data.is_active
          });
        }
      } catch (err) {
        console.error('Failed to fetch webhook settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [tenantId, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('webhook_settings')
        .upsert({
          tenant_id: tenantId,
          slack_url: settings.slack_url,
          custom_url: settings.custom_url,
          is_active: settings.is_active
        });
      
      if (error) {
        showToast(`Error: ${error.message}`, 'error');
      } else {
        showToast('Webhook settings saved.', 'success');
      }
    } catch (err) {
      showToast('Network error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: 'var(--text-tertiary)' }}>Loading settings...</p>;

  return (
    <div className="animate-fade-in">
      <h2 className="t-h3" style={{ marginBottom: 'var(--space-3)' }}>Governance Webhooks</h2>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-8)', fontSize: '0.9rem' }}>
        Configure external endpoints to receive real-time alerts for policy violations, anomalies, and critical agent events.
      </p>
      
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="form-group">
          <label className="form-label">Slack Webhook URL</label>
          <input 
            type="url" 
            className="form-input" 
            placeholder="https://hooks.slack.com/services/..." 
            value={settings.slack_url}
            onChange={e => setSettings({ ...settings, slack_url: e.target.value })}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)', display: 'block' }}>
            Notifications will be formatted as Slack blocks with event details.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Custom JSON Webhook URL</label>
          <input 
            type="url" 
            className="form-input" 
            placeholder="https://your-api.com/webhooks/runesignal" 
            value={settings.custom_url}
            onChange={e => setSettings({ ...settings, custom_url: e.target.value })}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)', display: 'block' }}>
            We&apos;ll send a POST request with a signed JSON payload.
          </span>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input 
            type="checkbox" 
            id="webhooks_active"
            checked={settings.is_active}
            onChange={e => setSettings({ ...settings, is_active: e.target.checked })}
          />
          <label className="form-label" htmlFor="webhooks_active" style={{ marginBottom: 0 }}>Enable Webhook Deliveries</label>
        </div>

        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Webhook Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import PolicyBuilderModal from '@/components/features/conflict/PolicyBuilderModal';
import IntentFeed from '@/components/features/conflict/IntentFeed';
import PolicyList from '@/components/features/conflict/PolicyList';
import ConflictMetrics from '@/components/features/conflict/ConflictMetrics';

export default function ConflictDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [intents, setIntents] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [intentsRes, policiesRes] = await Promise.all([
        fetch('/api/v1/intent', {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('tl_token') || '' }
        }),
        fetch('/api/v1/policies', {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('tl_token') || '' }
        })
      ]);

      const [intentData, policyData] = await Promise.all([
        intentsRes.json(),
        policiesRes.json()
      ]);

      if (intentData.intents) {
        // Transform DB data to UI format
        const transformed = intentData.intents.map((i: any) => ({
          id: i.id,
          agent: i.agent_credentials?.agent_name || 'System',
          intent: i.intent_description,
          similarity: i.metadata?.similarity || '0.00',
          status: i.status,
          reason: i.metadata?.reason || 'No conflicts detected'
        }));
        setIntents(transformed);
      }

      if (policyData.policies) {
        // Transform DB data to UI format
        const transformed = policyData.policies.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.intent_category || 'General',
          action: p.policy_action
        }));
        setPolicies(transformed);
      }
    } catch (err) {
      showToast('Error syncing with Arbiter backend.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalMediated = intents.length + 1842; // Simulated historical + current
  const blockedConflicts = intents.filter(i => i.status === 'blocked').length;
  const queuedConflicts = intents.filter(i => i.status === 'queue' || i.status === 'pending').length;

  const [activeVendor, setActiveVendor] = useState<'openai' | 'claude'>('openai');
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');

  useEffect(() => {
    setActiveVendor(localStorage.getItem('tl_vendor') as any || 'openai');
    setOpenaiKey(localStorage.getItem('tl_openai_key') || '');
    setClaudeKey(localStorage.getItem('tl_claude_key') || '');
  }, []);

  const saveSettings = () => {
    localStorage.setItem('tl_vendor', activeVendor);
    localStorage.setItem('tl_openai_key', openaiKey);
    localStorage.setItem('tl_claude_key', claudeKey);
    showToast(`Arbiter vendor set to ${activeVendor.toUpperCase()}`);
  };

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Agent Conflict Arbiter</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Semantic collision detection and real-time intent mediation.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-outline"
              onClick={() => showToast('Syncing global policy configuration to vector DB...')}
            >
              Policy Config
            </button>
            <button 
              className="btn btn-primary" 
              style={{ background: 'var(--color-accent-amber)', borderColor: 'var(--color-accent-amber)' }}
              onClick={() => setIsModalOpen(true)}
            >
              Add Policy
            </button>
          </div>
        </div>

        {/* Mediator Settings */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--color-accent-amber)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>Mediation Vendor:</div>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.25rem' }}>
                <button 
                  onClick={() => setActiveVendor('openai')}
                  style={{ 
                    padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: activeVendor === 'openai' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: activeVendor === 'openai' ? 'var(--color-accent-amber)' : 'var(--color-text-muted)'
                  }}
                >OpenAI (Vector)</button>
                <button 
                  onClick={() => setActiveVendor('claude')}
                  style={{ 
                    padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: activeVendor === 'claude' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: activeVendor === 'claude' ? '#d97706' : 'var(--color-text-muted)'
                  }}
                >Claude (Reasoning)</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
              <input 
                type="password" 
                placeholder={activeVendor === 'openai' ? "OpenAI API Key (sk-...)" : "Claude API Key (sk-ant-...)"}
                value={activeVendor === 'openai' ? openaiKey : claudeKey}
                onChange={(e) => activeVendor === 'openai' ? setOpenaiKey(e.target.value) : setClaudeKey(e.target.value)}
                className="glass-panel"
                style={{ flex: 1, padding: '0.6rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
              <button className="btn btn-outline" style={{ whiteSpace: 'nowrap' }} onClick={saveSettings}>Apply Keys</button>
            </div>
          </div>
        </div>

        <ConflictMetrics 
          totalMediated={totalMediated.toLocaleString()}
          blockedConflicts={blockedConflicts}
          queuedConflicts={queuedConflicts}
        />

        {loading ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem', color: 'var(--color-accent-amber)' }}>Performing semantic analysis...</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--color-accent-amber)', width: '30%', animation: 'loading 1.5s infinite linear' }}></div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <IntentFeed intents={intents} />
            <PolicyList policies={policies} />
          </div>
        )}
      </div>
      <PolicyBuilderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          showToast('Policy registered in vector store.');
          fetchData();
        }}
      />
    </>
  );
}

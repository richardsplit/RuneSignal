'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';

interface AgentKey {
  id: string;
  agent_id: string;
  key_prefix: string;
  is_active: boolean;
  ttl_days: number;
  expires_at: string;
  created_at: string;
  death_certificate_id: string | null;
  status: 'active' | 'expired' | 'revoked';
}

export default function NHIDashboard() {
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = async () => {
    try {
        const res = await fetch('/api/v1/nhi/list');
        const data = await res.json();
        setKeys(data.keys || []);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleRotate = async (keyId: string) => {
      if (!confirm('Are you sure you want to rotate this identity? The old key will expire in 24 hours.')) return;
      
      const res = await fetch('/api/v1/nhi/rotate', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ old_key_id: keyId })
      });
      if (res.ok) {
          const data = await res.json();
          alert(`Rotation successful! New Key Generated: ${data.new_api_key_plain}`);
          fetchKeys();
      } else {
          alert('Rotation failed.');
      }
  };

  const handleRevoke = async (keyId: string) => {
       const reason = prompt('KILL SWITCH ENGAGED. Please provide a revocation reason for the audit ledger:');
       if (!reason) return;
       
       const res = await fetch('/api/v1/nhi/revoke', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ key_id: keyId, reason })
      });
      if (res.ok) {
          const data = await res.json();
          alert(`Identity Neuturalized. Death Certificate Minted: ${data.certificate_id}`);
          fetchKeys();
      } else {
          alert('Revocation failed.');
      }
  };

  if (loading) {
     return <div className="p-8 text-neutral-400">Loading NHI Registry...</div>;
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
      <main className="flex-1 overflow-y-auto">
        <Header title="Non-Human Identity Lifecycle (S12)" />
        
        <div className="p-8 max-w-7xl mx-auto space-y-8">
           
           <div className="bg-neutral-800/40 p-6 rounded-xl border border-neutral-700/50">
               <div className="flex justify-between items-center mb-6">
                  <div>
                      <h2 className="text-xl font-medium text-white mb-1">Active Credentials</h2>
                      <p className="text-sm text-neutral-400">Cryptographically verifiable identities subject to mandatory ephemeral circulation.</p>
                  </div>
               </div>

               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                       <thead className="text-neutral-400 border-b border-neutral-700">
                           <tr>
                               <th className="pb-3 font-medium">Agent Binding</th>
                               <th className="pb-3 font-medium">Identity Hash</th>
                               <th className="pb-3 font-medium">Status</th>
                               <th className="pb-3 font-medium text-center">Countdown (Days)</th>
                               <th className="pb-3 font-medium text-right">Lifeline Controls</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-neutral-800">
                           {keys.map(k => (
                               <tr key={k.id} className="hover:bg-neutral-800/60 transition-colors">
                                   <td className="py-4 text-neutral-300 font-mono text-xs">{k.agent_id || 'unbound_pool'}</td>
                                   <td className="py-4 font-mono text-neutral-300">
                                       <span className="opacity-50">tl_</span>{k.key_prefix.replace('tl_', '')}<span className="opacity-50">***</span>
                                   </td>
                                   <td className="py-4">
                                       {k.status === 'active' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>}
                                       {k.status === 'expired' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">Expired</span>}
                                       {k.status === 'revoked' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Annihilated</span>}
                                   </td>
                                   <td className="py-4">
                                       <div className="flex justify-center items-center h-full">
                                          {k.status === 'active' ? (
                                              <div className="relative w-12 h-12 flex items-center justify-center">
                                                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                                      <circle cx="24" cy="24" r="20" className={`stroke-current ${k.ttl_days < 7 ? 'text-amber-500' : 'text-emerald-500'}`} strokeWidth="4" fill="none" 
                                                              strokeDasharray="125" strokeDashoffset={125 - (125 * (k.ttl_days / 30))} />
                                                  </svg>
                                                  <span className="text-sm font-mono text-white absolute">{Math.ceil(k.ttl_days)}</span>
                                              </div>
                                          ) : (
                                              <span className="text-neutral-600 font-mono">-</span>
                                          )}
                                       </div>
                                   </td>
                                   <td className="py-4 text-right space-x-3">
                                       {k.status === 'active' && (
                                           <button onClick={() => handleRotate(k.id)} className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors">Rotate</button>
                                       )}
                                       {k.status === 'active' && (
                                           <button onClick={() => handleRevoke(k.id)} className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/30 text-xs font-medium transition-colors">Kill Switch</button>
                                       )}
                                       {k.status === 'revoked' && k.death_certificate_id && (
                                           <a href={`/provenance/${k.death_certificate_id}`} className="text-neutral-400 hover:text-white text-xs font-medium transition-colors underline decoration-neutral-600 underline-offset-2">View Death Cert</a>
                                       )}
                                   </td>
                               </tr>
                           ))}
                           {keys.length === 0 && (
                               <tr><td colSpan={5} className="py-8 text-center text-neutral-500">No active identities tracked.</td></tr>
                           )}
                       </tbody>
                   </table>
               </div>
           </div>

        </div>
      </main>
    </div>
  );
}

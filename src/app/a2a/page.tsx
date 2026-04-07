'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';

interface A2ASignature {
    agent_id: string;
    created_at: string;
}

interface Handshake {
    id: string;
    initiator_id: string;
    responder_id: string;
    terms_hash: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
    created_at: string;
    a2a_signatures: A2ASignature[];
}

export default function A2ADashboard() {
  const [handshakes, setHandshakes] = useState<Handshake[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHandshakes = async () => {
    try {
        const res = await fetch('/api/v1/a2a/list');
        const data = await res.json();
        setHandshakes(data.handshakes || []);
    } catch(e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandshakes();
    const interval = setInterval(fetchHandshakes, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
      return <div className="p-8 text-neutral-400">Synchronizing with A2A Escrow Network...</div>;
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
      <main className="flex-1 overflow-y-auto">
        <Header title="Machine-to-Machine Gateway (S16)" />
        
        <div className="p-8 max-w-7xl mx-auto space-y-8">
           <div className="bg-neutral-800/40 p-8 rounded-xl border border-neutral-700/50">
               <h2 className="text-xl font-medium text-white mb-2">Multi-Agent Escrow Pipelines</h2>
               <p className="text-sm text-neutral-400 mb-8">TrustLayer neutral clearinghouse enforcing cryptographic handshakes between autonomous systems.</p>
               
               <div className="space-y-6">
                   {handshakes.map(h => {
                       const initiatorSigned = h.a2a_signatures?.some(s => s.agent_id === h.initiator_id);
                       const responderSigned = h.a2a_signatures?.some(s => s.agent_id === h.responder_id);

                       return (
                           <div key={h.id} className="relative p-6 rounded-lg bg-neutral-800/80 border border-neutral-700/80 overflow-hidden">
                               {/* Background Line Connector */}
                               <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-700 -z-10 -translate-y-1/2 mx-24"></div>
                               
                               <div className="flex justify-between items-center relative z-10 w-full mb-4">
                                   <div className="font-mono text-[10px] text-neutral-500 text-center absolute -top-4 w-full">Contract Hash: {h.terms_hash}</div>
                               </div>

                               <div className="grid grid-cols-3 gap-4 items-center">
                                   
                                   {/* Initiator */}
                                   <div className={`p-4 rounded-lg flex flex-col items-center justify-center border-2 transition-colors
                                      ${initiatorSigned ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-neutral-600 bg-neutral-900/40'}`}>
                                       <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-neutral-800 border border-neutral-600">
                                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={initiatorSigned ? 'text-emerald-400' : 'text-neutral-400'}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                       </div>
                                       <span className="text-xs font-mono text-neutral-300 w-full text-center truncate px-2">{h.initiator_id}</span>
                                       <span className={`mt-2 text-[10px] uppercase font-bold tracking-widest ${initiatorSigned ? 'text-emerald-500' : 'text-neutral-500'}`}>
                                           {initiatorSigned ? 'Signed' : 'Awaiting'}
                                       </span>
                                   </div>

                                   {/* Status Hub */}
                                   <div className="flex flex-col items-center justify-center">
                                       <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 z-20 transition-all
                                           ${h.status === 'accepted' ? 'border-indigo-500 bg-indigo-900 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'border-neutral-600 bg-neutral-800'}`}>
                                           {h.status === 'accepted' ? (
                                               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-300"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                           ) : (
                                               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                           )}
                                       </div>
                                       <span className={`mt-3 text-xs uppercase font-bold tracking-widest ${h.status === 'accepted' ? 'text-indigo-400' : 'text-neutral-400'}`}>
                                           {h.status}
                                       </span>
                                       <span className="text-[10px] font-mono text-neutral-500 mt-1">{new Date(h.created_at).toLocaleString()}</span>
                                   </div>

                                   {/* Responder */}
                                   <div className={`p-4 rounded-lg flex flex-col items-center justify-center border-2 transition-colors
                                      ${responderSigned ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-neutral-600 bg-neutral-900/40'}`}>
                                       <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-neutral-800 border border-neutral-600">
                                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={responderSigned ? 'text-emerald-400' : 'text-neutral-400'}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                       </div>
                                       <span className="text-xs font-mono text-neutral-300 w-full text-center truncate px-2">{h.responder_id}</span>
                                       <span className={`mt-2 text-[10px] uppercase font-bold tracking-widest ${responderSigned ? 'text-emerald-500' : 'text-neutral-500'}`}>
                                           {responderSigned ? 'Signed' : 'Awaiting'}
                                       </span>
                                   </div>

                               </div>
                           </div>
                       );
                   })}

                   {handshakes.length === 0 && (
                       <div className="py-16 text-center border-2 border-dashed border-neutral-700/50 rounded-xl">
                           <p className="text-neutral-500">No A2A handshakes active on this tenant domain.</p>
                       </div>
                   )}
               </div>
           </div>
        </div>
      </main>
    </div>
  );
}

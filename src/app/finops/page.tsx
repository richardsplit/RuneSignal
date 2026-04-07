'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

interface Breakdown {
  total: number;
  by_agent: Record<string, number>;
  by_model: Record<string, number>;
}

export default function FinOpsDashboard() {
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);

  useEffect(() => {
    fetch('/api/v1/finops/breakdown?days=30')
      .then(r => r.json())
      .then(data => setBreakdown(data))
      .catch(console.error);
  }, []);

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
      <main className="flex-1 overflow-y-auto">
        <Header title="Agent FinOps Control Plane" />
        
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700/50 shadow-xl backdrop-blur-sm">
             <h2 className="text-xl font-medium text-emerald-400 mb-2">Total Monthly Spend</h2>
             <p className="text-5xl font-mono text-white">${breakdown?.total.toFixed(4) || "0.0000"}</p>
             <p className="text-sm text-neutral-400 mt-2">Trailing 30 Days</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-neutral-800/40 p-6 rounded-lg border border-neutral-700/50">
               <h3 className="text-lg font-medium text-white mb-4">Cost by Model</h3>
               <div className="space-y-3">
                 {breakdown?.by_model && Object.entries(breakdown.by_model).map(([model, cost]) => (
                   <div key={model} className="flex justify-between items-center bg-neutral-800/80 p-3 rounded">
                     <span className="font-mono text-sm text-neutral-300">{model}</span>
                     <span className="font-mono text-emerald-300">${cost.toFixed(4)}</span>
                   </div>
                 ))}
               </div>
             </div>
             
             <div className="bg-neutral-800/40 p-6 rounded-lg border border-neutral-700/50">
               <h3 className="text-lg font-medium text-white mb-4">Cost by Agent</h3>
               <div className="space-y-3">
                 {breakdown?.by_agent && Object.entries(breakdown.by_agent).map(([agentId, cost]) => (
                   <div key={agentId} className="flex justify-between items-center bg-neutral-800/80 p-3 rounded">
                     <span className="font-mono text-xs text-neutral-400 truncate w-32">{agentId}</span>
                     <span className="font-mono text-emerald-300">${cost.toFixed(4)}</span>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

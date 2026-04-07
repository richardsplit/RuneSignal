'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';

interface KineticPolicy {
    max_velocity_ms: number;
    geofence_radius_m: number;
    is_estop_active: boolean;
}

interface HardwareNode {
    id: string;
    name: string;
    device_type: string;
    status: string;
    nhi_agent_id: string;
    kinetic_policies: KineticPolicy[];
}

export default function PhysicalAIDashboard() {
  const [nodes, setNodes] = useState<HardwareNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNodes = async () => {
    try {
        const res = await fetch('/api/v1/physical/nodes');
        const data = await res.json();
        setNodes(data.nodes || []);
    } catch(e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    // Poll for hardware status every 5 seconds
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerEStop = async (nodeId: string) => {
     if (!confirm('WARNING: THIS WILL ENGAGE A PHYSICAL KILL-SWITCH. THE HARDWARE WILL HARD-LOCK. Proceed?')) return;
     
     const res = await fetch('/api/v1/physical/estop', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ node_id: nodeId })
     });
     
     if (res.ok) {
         alert('CRITICAL E-STOP ENGAGED. Physical node is locked.');
         fetchNodes();
     } else {
         alert('Failed to transmit E-Stop signal.');
     }
  };

  const getEstopStatus = (n: HardwareNode) => {
      const ext = n.kinetic_policies && n.kinetic_policies.length > 0 ? n.kinetic_policies[0].is_estop_active : false;
      return n.status === 'estop_engaged' || ext;
  };

  if (loading) {
      return <div className="p-8 text-neutral-400">Connecting to physical telemetry feeds...</div>;
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
      <main className="flex-1 overflow-y-auto">
        <Header title="Physical AI Overrides (S15)" />
        
        <div className="p-8 max-w-7xl mx-auto space-y-8">
           <div className="bg-neutral-800/40 p-6 rounded-xl border border-neutral-700/50">
               <h2 className="text-xl font-medium text-white mb-2">Hardware Fleet Overview</h2>
               <p className="text-sm text-neutral-400 mb-6">Deterministic kinetic safety blocks and zero-latency emergency stop controls for robotics and IoT agents.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {nodes.map(node => {
                       const estopEngaged = getEstopStatus(node);
                       const policy = node.kinetic_policies?.[0];

                       return (
                           <div key={node.id} className={`p-5 rounded-lg border flex flex-col justify-between ${estopEngaged ? 'bg-red-900/10 border-red-500/50' : 'bg-neutral-800/80 border-neutral-700'}`}>
                               <div className="mb-4">
                                   <div className="flex justify-between items-start mb-2">
                                      <h3 className="text-lg font-medium text-white truncate max-w-[200px]">{node.name}</h3>
                                      {estopEngaged ? (
                                         <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">LOCKED</span>
                                      ) : (
                                         <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">LIVE</span>
                                      )}
                                   </div>
                                   <div className="font-mono text-xs text-neutral-500">ID: {node.id.split('-')[0]}...</div>
                                   <div className="font-mono text-xs text-neutral-500 mt-1 capitalize">{node.device_type}</div>
                               </div>

                               <div className="mb-6 bg-neutral-900/50 p-3 rounded font-mono text-xs text-neutral-400 flex flex-col gap-2">
                                  <div className="flex justify-between">
                                      <span>Max Velocity Limits:</span>
                                      <span className="text-emerald-300">{policy?.max_velocity_ms || 0} m/s</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span>Geofence Boundary:</span>
                                      <span className="text-indigo-300">{policy?.geofence_radius_m || 'Unbounded'}m</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span>NHI Link:</span>
                                      <span className={node.nhi_agent_id ? "text-cyan-300 text-[10px]" : "text-neutral-600"}>
                                         {node.nhi_agent_id ? `${node.nhi_agent_id.split('-')[0]}...` : 'None'}
                                      </span>
                                  </div>
                               </div>

                               <button 
                                  onClick={() => triggerEStop(node.id)}
                                  disabled={estopEngaged}
                                  className={`w-full py-3 rounded text-sm font-bold tracking-wider transition-all
                                     ${estopEngaged ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border-none' : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_4px_15px_rgba(220,38,38,0.4)] border border-red-500/50'}`}
                               >
                                  {estopEngaged ? 'E-STOP HARDLOCKED' : 'ENGAGE KINETIC E-STOP'}
                               </button>
                           </div>
                       );
                   })}

                   {nodes.length === 0 && (
                       <div className="col-span-full py-12 text-center text-neutral-500 border border-dashed border-neutral-700 rounded-lg">
                           No hardware nodes registered to this tenant.
                       </div>
                   )}
               </div>
           </div>
        </div>
      </main>
    </div>
  );
}

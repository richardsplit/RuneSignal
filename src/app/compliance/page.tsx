'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';

interface Framework {
  id: string;
  name: string;
  description: string;
  version: string;
  controls_count: number;
  evidence_count: number;
  progress_pct: number;
}

interface Control {
  id: string;
  control_code: string;
  title: string;
  description: string;
  satisfied: boolean;
  evidence: any[];
}

export default function ComplianceDashboard() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [activeFw, setActiveFw] = useState<Framework | null>(null);
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/compliance/frameworks')
      .then(r => r.json())
      .then(d => {
        setFrameworks(d.frameworks || []);
        if (d.frameworks?.length > 0) {
          setActiveFw(d.frameworks[0]);
        }
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeFw) {
      fetch(`/api/v1/compliance/evidence?framework_id=${activeFw.id}`)
        .then(r => r.json())
        .then(d => {
          setControls(d.controls || []);
        })
        .catch(console.error);
    }
  }, [activeFw]);

  const handleAutoMine = async () => {
    await fetch('/api/v1/compliance/frameworks', { method: 'POST' });
    window.location.reload();
  };

  const handleExport = () => {
    if (!activeFw) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Control Code,Title,Satisfied,Evidence Count\n"
      + controls.map(c => `${c.control_code},"${c.title}",${c.satisfied},${c.evidence?.length || 0}`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TrustLayer_Compliance_Export_${activeFw.name.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
     return <div className="p-8 text-neutral-400">Loading Intelligence Hub...</div>;
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
      <main className="flex-1 overflow-y-auto">
        <Header title="Governance Intelligence Hub (S13)" />
        
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              {frameworks.map(fw => (
                <button 
                  key={fw.id}
                  onClick={() => setActiveFw(fw)}
                  className={`px-5 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${
                    activeFw?.id === fw.id 
                    ? 'bg-neutral-800/80 border-emerald-500 text-emerald-400' 
                    : 'bg-transparent border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  }`}
                >
                  {fw.name} <span className="text-xs ml-2 opacity-60">v{fw.version}</span>
                </button>
              ))}
            </div>
            
            <div className="flex gap-4">
                <button onClick={handleAutoMine} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm transition-colors border border-indigo-500/50">
                    Auto-Mine Ledger
                </button>
                <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm transition-colors border border-emerald-500/50">
                    Export Evidence Bundle
                </button>
            </div>
          </div>

          {activeFw && (
            <>
              {/* Evidence Gauge / Scorecard */}
              <div className="bg-neutral-800/30 p-6 rounded-xl border border-neutral-700/50 flex items-center justify-between">
                 <div>
                    <h2 className="text-3xl font-light text-white mb-1">{activeFw.name} Readiness</h2>
                    <p className="text-neutral-400 text-sm max-w-xl">{activeFw.description}</p>
                 </div>
                 
                 <div className="flex items-center space-x-6">
                    <div className="text-right">
                       <p className="text-sm text-neutral-400">Controls Satisfied</p>
                       <p className="text-2xl font-mono text-emerald-400">{activeFw.evidence_count} / {activeFw.controls_count}</p>
                    </div>
                    
                    <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-neutral-900 border-4 border-neutral-700">
                       {/* Extremely basic visual progress representation */}
                       <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                          <circle cx="44" cy="44" r="44" className="text-emerald-500 stroke-current" strokeWidth="8" fill="none" 
                                  strokeDasharray="276" strokeDashoffset={276 - (276 * activeFw.progress_pct) / 100} 
                                  style={{ transform: 'translate(4px, 4px)' }} />
                       </svg>
                       <span className="text-xl font-medium text-white">{activeFw.progress_pct}%</span>
                    </div>
                 </div>
              </div>

              {/* Gap List / Controls Table */}
              <div className="bg-neutral-800/40 rounded-xl border border-neutral-700/50 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-800/80 text-neutral-300">
                    <tr>
                      <th className="p-4 font-medium">Control</th>
                      <th className="p-4 font-medium">Description</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Evidence Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700/50">
                    {controls.map(control => (
                      <tr key={control.id} className="hover:bg-neutral-800/60 transition-colors">
                        <td className="p-4 font-mono text-neutral-300 whitespace-nowrap">{control.control_code}</td>
                        <td className="p-4 text-neutral-400 max-w-md">
                           <p className="font-medium text-neutral-200">{control.title}</p>
                           <p className="truncate">{control.description}</p>
                        </td>
                        <td className="p-4">
                           {control.satisfied ? (
                               <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">Satisfied</span>
                           ) : (
                               <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium border border-amber-500/20">Gap Identified</span>
                           )}
                        </td>
                        <td className="p-4 font-mono text-neutral-300">
                            {control.evidence?.length || 0} items
                        </td>
                      </tr>
                    ))}
                    {controls.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-neutral-500">No controls mapped to this framework yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}

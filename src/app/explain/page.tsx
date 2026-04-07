'use client';
import { useState } from 'react';
import Header from '@/components/Header';

export default function ExplainabilityDashboard() {
  const [certId, setCertId] = useState('');
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certId.trim()) return;

    setLoading(true);
    setError('');
    setExplanation(null);

    try {
      const res = await fetch(`/api/v1/explain?certificate_id=${certId}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch explanation.');
      
      setExplanation(data.explanation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
      <main className="flex-1 overflow-y-auto">
        <Header title="AI Decision Explainability Engine (S11)" />
        
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="bg-neutral-800/40 p-6 rounded-xl border border-neutral-700/50">
               <h2 className="text-xl font-medium text-white mb-2">Cryptographic Certificate Trace</h2>
               <p className="text-sm text-neutral-400 mb-6">Enter a valid S3 Provenance Certificate ID to decode exactly why an autonomous agent made a specific decision.</p>

               <form onSubmit={handleSearch} className="flex gap-4">
                   <input 
                      type="text" 
                      value={certId} 
                      onChange={e => setCertId(e.target.value)}
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded p-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                   />
                   <button 
                      type="submit" 
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-medium px-6 rounded transition-colors whitespace-nowrap"
                   >
                      {loading ? 'Evaluating Model...' : 'Generate Trace'}
                   </button>
               </form>
               
               {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
            </div>

            {explanation && (
                <div className="bg-neutral-800/60 p-8 rounded-xl border border-neutral-700/80 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-start mb-6 pb-6 border-b border-neutral-700/50">
                        <div>
                            <h3 className="text-2xl font-light text-white mb-2">Causal Explanation</h3>
                            <p className="font-mono text-xs text-neutral-500">Target: {explanation.certificate_id} | Post-Processor: {explanation.model_used}</p>
                        </div>
                        <button className="px-4 py-2 border border-emerald-500/30 text-emerald-400 rounded text-sm hover:bg-emerald-500/10 transition-colors">
                           Export ISO 42001 PDF
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-3">Decision Summary</h4>
                            <p className="text-neutral-200 text-lg leading-relaxed">{explanation.decision_summary}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-3">Causal Factors</h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {explanation.causal_factors?.map((factor: string, i: number) => (
                                    <li key={i} className="bg-neutral-900/50 p-4 rounded border border-neutral-700/50 flex items-start gap-3">
                                        <div className="text-emerald-500 mt-1">
                                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"></path></svg>
                                        </div>
                                        <span className="text-neutral-300">{factor}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-3">Regulatory Adherence Logic</h4>
                            <div className="bg-indigo-900/10 p-5 rounded border border-indigo-500/20 font-mono text-sm">
                                <pre className="text-indigo-300 whitespace-pre-wrap">{JSON.stringify(explanation.regulatory_mapping, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

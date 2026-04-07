'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';

interface Attack {
  id: string;
  attack_vector: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  was_defended: boolean;
  executed_at: string;
}

interface Campaign {
  id: string;
  target_agent_id: string;
  status: 'running' | 'completed' | 'failed';
  total_attacks: number;
  successful_defenses: number;
  resilience_score: number;
  created_at: string;
  red_team_attacks: Attack[];
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-neutral-400 border-neutral-600 bg-neutral-800/60',
  medium: 'text-amber-400 border-amber-700/50 bg-amber-900/10',
  high: 'text-orange-400 border-orange-700/50 bg-orange-900/10',
  critical: 'text-red-400 border-red-700/50 bg-red-900/10',
};

const VECTOR_LABELS: Record<string, string> = {
  jailbreak: 'Jailbreak',
  roleplay_bypass: 'Roleplay Bypass',
  injection: 'Prompt Injection',
  extraction: 'Data Extraction',
};

export default function RedTeamDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [resilienceScore, setResilienceScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [targetAgent, setTargetAgent] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/v1/redteam/launch');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setResilienceScore(data.resilience_score || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAgent.trim()) return;
    setLaunching(true);
    try {
      const res = await fetch('/api/v1/redteam/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_agent_id: targetAgent }),
      });
      if (res.ok) {
        await fetchData();
        setTargetAgent('');
      }
    } finally {
      setLaunching(false);
    }
  };

  const scoreColor = resilienceScore >= 80 ? 'text-emerald-400' : resilienceScore >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreGradient = resilienceScore >= 80 ? '#10b981' : resilienceScore >= 50 ? '#f59e0b' : '#ef4444';

  if (loading) return <div className="p-8 text-neutral-400">Initializing Red Team War Room...</div>;

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
      <main className="flex-1 overflow-y-auto">
        <Header title="Continuous Red Teaming (S17)" />

        <div className="p-8 max-w-7xl mx-auto space-y-8">

          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-6">
            {/* Resilience Score Gauge */}
            <div className="col-span-1 bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-6 flex flex-col items-center justify-center">
              <p className="text-sm text-neutral-400 mb-4 uppercase tracking-widest font-semibold">Fleet Resilience</p>
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#262626" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={scoreGradient} strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="314"
                    strokeDashoffset={314 - (314 * resilienceScore) / 100}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-mono font-bold ${scoreColor}`}>{Math.round(resilienceScore)}</span>
                  <span className="text-neutral-500 text-sm">/ 100</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="col-span-2 grid grid-cols-3 gap-4">
              {[
                { label: 'Campaigns Run', value: campaigns.length },
                { label: 'Total Attacks Fired', value: campaigns.reduce((a, c) => a + c.total_attacks, 0) },
                { label: 'Successful Defenses', value: campaigns.reduce((a, c) => a + c.successful_defenses, 0) },
              ].map(stat => (
                <div key={stat.label} className="bg-neutral-800/40 p-5 rounded-xl border border-neutral-700/50 flex flex-col justify-between">
                  <span className="text-xs text-neutral-500 uppercase tracking-widest">{stat.label}</span>
                  <span className="text-4xl font-mono font-light text-white mt-2">{stat.value}</span>
                </div>
              ))}

              {/* Launch Form */}
              <div className="col-span-3 bg-neutral-800/40 p-5 rounded-xl border border-neutral-700/50">
                <form onSubmit={handleLaunch} className="flex gap-3">
                  <input
                    type="text"
                    value={targetAgent}
                    onChange={e => setTargetAgent(e.target.value)}
                    placeholder="Target Agent ID (e.g. agent-uuid or 'all')"
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={launching}
                    className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-6 py-2 rounded tracking-widest text-sm transition-colors shadow-[0_4px_15px_rgba(220,38,38,0.3)] whitespace-nowrap"
                  >
                    {launching ? 'LAUNCHING...' : '⚡ FIRE CAMPAIGN'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Campaign History */}
          <div className="space-y-6">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="bg-neutral-800/40 rounded-xl border border-neutral-700/50 overflow-hidden">
                <div className="p-5 border-b border-neutral-700/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-mono text-sm text-neutral-300">
                      <span className="text-neutral-500">Target: </span>{campaign.target_agent_id}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{new Date(campaign.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm">
                      <span className="text-emerald-400">{campaign.successful_defenses}</span>
                      <span className="text-neutral-500"> / {campaign.total_attacks} defended</span>
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${
                      campaign.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      campaign.status === 'running' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>{campaign.status}</span>
                  </div>
                </div>

                <div className="divide-y divide-neutral-800">
                  {campaign.red_team_attacks?.slice(0, 5).map(attack => (
                    <div key={attack.id} className="flex items-center gap-4 px-5 py-3 hover:bg-neutral-800/60 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${attack.was_defended ? 'bg-emerald-500' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]'}`} />
                      <span className={`text-xs px-2 py-0.5 rounded border font-mono uppercase tracking-wider ${SEVERITY_COLORS[attack.severity]}`}>
                        {attack.severity}
                      </span>
                      <span className="text-xs text-neutral-400 w-28 flex-shrink-0">{VECTOR_LABELS[attack.attack_vector] || attack.attack_vector}</span>
                      <span className={`text-xs font-bold ml-auto ${attack.was_defended ? 'text-emerald-500' : 'text-red-400'}`}>
                        {attack.was_defended ? '✓ DEFENDED' : '✗ BREACHED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {campaigns.length === 0 && (
              <div className="py-16 text-center border-2 border-dashed border-neutral-700/50 rounded-xl">
                <p className="text-neutral-500">No campaigns fired yet. Enter an agent ID and launch your first attack sequence.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

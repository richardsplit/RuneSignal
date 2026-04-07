'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';

interface AnomalyEvent {
  id: string;
  agent_id: string;
  anomaly_type: string;
  z_score: number;
  baseline_value: number;
  observed_value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  created_at: string;
}

const SEVERITY_CONFIG = {
  low:      { dot: 'bg-neutral-400', badge: 'text-neutral-400 border-neutral-600 bg-neutral-800/50' },
  medium:   { dot: 'bg-amber-400',   badge: 'text-amber-400 border-amber-700/40 bg-amber-900/10' },
  high:     { dot: 'bg-orange-400',  badge: 'text-orange-400 border-orange-700/40 bg-orange-900/10' },
  critical: { dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse', badge: 'text-red-400 border-red-700/40 bg-red-900/10' },
};

const TYPE_LABELS: Record<string, string> = {
  cost_spike:   '💰 Cost Spike',
  token_volume: '📊 Token Volume',
  error_rate:   '❌ Error Rate',
  velocity:     '⚡ Call Velocity',
};

export default function AnomalyDashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnomalies = async () => {
    try {
      const res = await fetch('/api/v1/anomaly');
      const data = await res.json();
      setAnomalies(data.anomalies || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string) => {
    await fetch('/api/v1/anomaly', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anomaly_id: id }),
    });
    fetchAnomalies();
  };

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;

  if (loading) return <div className="p-8 text-neutral-400">Scanning telemetry streams...</div>;

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans">
      <main className="flex-1 overflow-y-auto">
        <Header title="Anomaly Detector (S14)" />

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Active Anomalies', value: anomalies.length, color: 'text-white' },
              { label: 'Critical', value: anomalies.filter(a => a.severity === 'critical').length, color: 'text-red-400' },
              { label: 'High', value: anomalies.filter(a => a.severity === 'high').length, color: 'text-orange-400' },
              { label: 'Medium / Low', value: anomalies.filter(a => ['medium', 'low'].includes(a.severity)).length, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="bg-neutral-800/50 rounded-xl border border-neutral-700/50 p-5">
                <p className="text-xs text-neutral-500 uppercase tracking-widest">{s.label}</p>
                <p className={`text-4xl font-mono font-light mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {criticalCount > 0 && (
            <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/40 rounded-lg p-4">
              <span className="text-red-400 text-xl">⚠</span>
              <span className="text-red-300 font-medium">{criticalCount} critical anomal{criticalCount === 1 ? 'y' : 'ies'} require immediate investigation.</span>
            </div>
          )}

          {/* Anomaly Feed */}
          <div className="bg-neutral-800/40 rounded-xl border border-neutral-700/50 overflow-hidden">
            <div className="p-5 border-b border-neutral-700/50">
              <h3 className="font-medium text-white">Live Anomaly Feed</h3>
              <p className="text-sm text-neutral-400 mt-0.5">Real-time statistical deviations detected via Welford z-score streaming</p>
            </div>

            <div className="divide-y divide-neutral-800">
              {anomalies.map(anomaly => {
                const cfg = SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.low;
                return (
                  <div key={anomaly.id} className="flex items-center gap-5 px-6 py-4 hover:bg-neutral-800/60 transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-0.5">
                        <span className="font-medium text-neutral-200 text-sm">{TYPE_LABELS[anomaly.anomaly_type] || anomaly.anomaly_type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-widest ${cfg.badge}`}>
                          {anomaly.severity}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-neutral-500 truncate">
                        Agent: {anomaly.agent_id} · z={anomaly.z_score.toFixed(2)} · baseline={anomaly.baseline_value.toFixed(4)} → observed={anomaly.observed_value.toFixed(4)}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-neutral-500">{new Date(anomaly.created_at).toLocaleString()}</p>
                      <button
                        onClick={() => handleResolve(anomaly.id)}
                        className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Mark Resolved →
                      </button>
                    </div>
                  </div>
                );
              })}

              {anomalies.length === 0 && (
                <div className="py-14 text-center">
                  <div className="text-4xl mb-3">✓</div>
                  <p className="text-neutral-500">No active anomalies. All agent metrics within baseline tolerances.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

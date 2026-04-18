'use client';
import { useState, useEffect } from 'react';

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

const SEVERITY_BADGE: Record<string, string> = {
  low:      'badge badge-neutral',
  medium:   'badge badge-warning',
  high:     'badge badge-warning',
  critical: 'badge badge-danger',
};

const VECTOR_LABELS: Record<string, string> = {
  jailbreak:      'Jailbreak',
  roleplay_bypass: 'Roleplay Bypass',
  injection:      'Prompt Injection',
  extraction:     'Data Extraction',
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

  // Dynamic color based on score — use inline style with CSS vars
  const scoreColor =
    resilienceScore >= 80 ? 'var(--success)' :
    resilienceScore >= 50 ? 'var(--warning)' :
    'var(--danger)';
  const scoreGradient =
    resilienceScore >= 80 ? 'var(--success)' :
    resilienceScore >= 50 ? 'var(--warning)' :
    'var(--danger)';
  // SVG needs actual hex/rgb for stroke — resolve via inline style trick using a CSS variable fallback
  const scoreGradientHex =
    resilienceScore >= 80 ? '#10b981' :
    resilienceScore >= 50 ? '#f59e0b' :
    '#ef4444';

  const campaignStatusBadge = (status: Campaign['status']) => {
    if (status === 'completed') return 'badge badge-success';
    if (status === 'running')   return 'badge badge-warning';
    return 'badge badge-danger';
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p className="t-body-sm text-tertiary">Initializing Red Team War Room…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Red Teaming</h1>
        <p className="page-description">
          Automated OWASP Agentic AI Top 10 adversarial campaigns against registered agents.
        </p>
      </div>

      {/* Top 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', marginBottom: '1.5rem' }}>

        {/* Left: Resilience gauge */}
        <div className="surface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.75rem 1.5rem' }}>
          <p className="kpi-label" style={{ marginBottom: '1rem', textAlign: 'center' }}>Fleet Resilience</p>
          <div style={{ position: 'relative', width: 144, height: 144 }}>
            <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-3)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke={scoreGradientHex}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="314"
                strokeDashoffset={314 - (314 * resilienceScore) / 100}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="mono" style={{ fontSize: '2.25rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                {Math.round(resilienceScore)}
              </span>
              <span className="t-caption" style={{ marginTop: 2 }}>/ 100</span>
            </div>
          </div>
        </div>

        {/* Right: KPIs + launch form */}
        <div className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* KPI cells */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            {[
              { label: 'Campaigns', value: campaigns.length },
              { label: 'Total Attacks', value: campaigns.reduce((a, c) => a + c.total_attacks, 0) },
              { label: 'Defenses', value: campaigns.reduce((a, c) => a + c.successful_defenses, 0) },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: '1.1rem 1.25rem',
                  borderRight: i < 2 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <p className="kpi-label">{stat.label}</p>
                <p className="kpi-value">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Launch form */}
          <div style={{ padding: '1.1rem 1.25rem' }}>
            <form onSubmit={handleLaunch} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                value={targetAgent}
                onChange={e => setTargetAgent(e.target.value)}
                placeholder="Target Agent ID (e.g. agent-uuid or 'all')"
                style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem' }}
              />
              <button
                type="submit"
                className="btn btn-danger"
                disabled={launching}
                style={{ whiteSpace: 'nowrap', fontWeight: 700, letterSpacing: '0.05em' }}
              >
                {launching ? 'Launching…' : 'Launch Campaign'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Campaign history */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {campaigns.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No campaigns fired yet</p>
            <p className="empty-state-body">Enter an agent ID and launch your first attack sequence.</p>
          </div>
        ) : (
          campaigns.map(campaign => (
            <div className="surface" key={campaign.id} style={{ overflow: 'hidden' }}>
              {/* Campaign panel header */}
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="t-caption">Target:</span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.8rem', color: 'var(--text-primary)',
                      maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {campaign.target_agent_id}
                  </span>
                  <span className={campaignStatusBadge(campaign.status)} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    {campaign.status}
                  </span>
                </div>
                <span className="t-body-sm text-tertiary">
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>{campaign.successful_defenses}</span>
                  {' / '}
                  {campaign.total_attacks}
                  <span> defended</span>
                </span>
              </div>

              {/* Attacks table */}
              {campaign.red_team_attacks?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Vector</th>
                        <th>Result</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaign.red_team_attacks.slice(0, 5).map(attack => (
                        <tr key={attack.id}>
                          <td>
                            <span className={SEVERITY_BADGE[attack.severity] || 'badge badge-neutral'} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                              {attack.severity}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {VECTOR_LABELS[attack.attack_vector] || attack.attack_vector}
                          </td>
                          <td>
                            {attack.was_defended ? (
                              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Defended</span>
                            ) : (
                              <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Breached</span>
                            )}
                          </td>
                          <td className="text-tertiary t-body-sm" style={{ whiteSpace: 'nowrap' }}>
                            {new Date(attack.executed_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

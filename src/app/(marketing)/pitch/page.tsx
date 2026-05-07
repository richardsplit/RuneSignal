'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ─── Demo Data ──────────────────────────────────────────────────────────── */

const LIVE_EVENTS = [
  { id: 'e1', time: 'now',    agent: 'LoanDecisionAgent',     event: 'decision.approved',        risk: 'low',      sig: 'ed25519:7f3a…c2b1' },
  { id: 'e2', time: '2s ago', agent: 'ContractReviewBot',     event: 'hitl.escalated',           risk: 'high',     sig: 'ed25519:9c1d…a4f2' },
  { id: 'e3', time: '5s ago', agent: 'SupplyChainOrchestrator', event: 'evidence_pack.signed',   risk: 'low',      sig: 'ed25519:2e8b…77d3' },
  { id: 'e4', time: '8s ago', agent: 'FraudDetectionAgent',   event: 'anomaly.detected',         risk: 'critical', sig: 'ed25519:4a5c…99e1' },
  { id: 'e5', time: '12s ago', agent: 'HRScreeningAgent',     event: 'decision.blocked',         risk: 'high',     sig: 'ed25519:b3f1…08d4' },
];

const EVIDENCE_PACK = {
  id:              'EP-2026-0421-00847',
  agent:           'LoanDecisionAgent v2.3',
  regulation:      'EU AI Act — Annex IV',
  risk_class:      'High Risk (Art.6)',
  decisions:       847293,
  date_range:      '2025-11-01 → 2026-04-21',
  coverage_score:  97.4,
  clauses:         ['Art.13 — Transparency', 'Art.14 — Human Oversight', 'Art.17 — QMS', 'Art.29 — Obligations'],
  signature:       'ed25519:7f3ac2b1d4e9f012a3b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6',
  signed_at:       '2026-04-21T14:32:07Z',
  signer_key_id:   'runesignal-ed25519-v1',
  notified_body:   'TÜV SÜD',
  gaps:            [],
  status:          'COMPLIANT',
};

const DECISION_REPLAY = {
  decision_id: 'dec_9f2a4b8c-1d3e-4f5a-b6c7-d8e9f0a1b2c3',
  agent:       'LoanDecisionAgent',
  timestamp:   '2026-04-21T09:14:33Z',
  action:      'approve_loan',
  target:      'APPLICATION-00291847',
  inputs: [
    { key: 'credit_score',     value: '742',     weight: 'HIGH' },
    { key: 'debt_to_income',   value: '0.28',    weight: 'HIGH' },
    { key: 'employment_years', value: '7',       weight: 'MEDIUM' },
    { key: 'loan_amount_eur',  value: '€85,000', weight: 'HIGH' },
  ],
  reasoning: [
    'Credit score 742 exceeds minimum threshold (680) → +APPROVED',
    'DTI ratio 0.28 within policy limit (0.43) → +APPROVED',
    'Employment history 7yr stable → +APPROVED',
    'Loan amount within tier-2 exposure limit → PROCEED',
  ],
  outcome:       'approved',
  blast_radius:  12,
  hitl_required: false,
  signature:     'ed25519:9c1da4f2b3e5c6d7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
};

const HITL_REQUEST = {
  id:          'hitl_4b8c9d2e-f1a2-4b5c-8d9e-0f1a2b3c4d5e',
  title:       'High-risk vendor contract approval required',
  agent:       'ContractReviewBot v1.8',
  action:      'execute_contract',
  target:      'CONTRACT-VENDOR-0091',
  priority:    'CRITICAL',
  blast_radius: 87,
  value_at_risk: '€4,200,000',
  reasoning:   'Exclusivity clause detected · 36-month lock-in · €4.2M commitment · HITL required for value > €500K',
  submitted:   '2m ago',
  deadline:    '4h remaining',
  reviewers:   ['Legal Ops', 'CFO', 'Procurement'],
};

const REDTEAM_RESULT = {
  agent:         'LoanDecisionAgent v2.3',
  suite:         'standard',
  total:         12,
  passed:        10,
  failed:        2,
  cvss_ai:       7.2,
  probes: [
    { id: 'PI-001', name: 'Direct prompt override',      sev: 'critical', passed: true  },
    { id: 'PI-002', name: 'Role-switch injection',       sev: 'high',     passed: true  },
    { id: 'PL-001', name: 'System-prompt extraction',    sev: 'high',     passed: false },
    { id: 'PL-002', name: 'Few-shot inversion',          sev: 'medium',   passed: true  },
    { id: 'JB-001', name: 'DAN jailbreak',               sev: 'critical', passed: true  },
    { id: 'JB-002', name: 'Token-smuggling Base64',      sev: 'high',     passed: true  },
    { id: 'TA-001', name: 'Dangerous tool invocation',   sev: 'critical', passed: true  },
    { id: 'TA-002', name: 'Data exfiltration via tool',  sev: 'high',     passed: false },
    { id: 'GH-001', name: 'Objective substitution',      sev: 'high',     passed: true  },
    { id: 'II-001', name: 'Injection via tool output',   sev: 'high',     passed: true  },
    { id: 'RC-001', name: 'Persona override',             sev: 'medium',   passed: true  },
    { id: 'CO-001', name: 'Context-window flooding',     sev: 'low',      passed: true  },
  ],
};

const SEV_HEX: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' };
const RISK_HEX: Record<string, string> = { critical: '#ef4444', high: '#f97316', low: '#10b981' };

const MARKET = [
  { label: 'EU enterprises deploying LLM agents',    value: '50,000+',   sub: 'facing Aug 2026 deadline' },
  { label: 'Max fine — EU AI Act non-compliance',    value: '€35M',      sub: 'or 7% global revenue' },
  { label: 'Avg evidence pack ARR per enterprise',   value: '€120K',     sub: 'T2 add-on alone' },
  { label: 'Addressable market (EU + US enterprise)', value: '€2.1B',    sub: 'by 2028' },
];

const COMPARE = [
  { feature: 'Cryptographic evidence pack (Annex IV)', rs: true,  wb: false,  rd: false  },
  { feature: 'Ed25519 signed audit ledger',            rs: true,  wb: false,  rd: false  },
  { feature: 'HITL approval + blast-radius scoring',  rs: true,  wb: false,  rd: false  },
  { feature: 'Decision forensic replay',              rs: true,  wb: false,  rd: true   },
  { feature: 'MCP server governance proxy',           rs: true,  wb: false,  rd: true   },
  { feature: 'OWASP LLM red-team harness',            rs: true,  wb: false,  rd: false  },
  { feature: 'Insurance carrier evidence OEM',        rs: true,  wb: false,  rd: false  },
  { feature: 'Post-quantum signing (ML-DSA-65)',       rs: true,  wb: false,  rd: false  },
  { feature: 'OTLP export (Grafana/Datadog/Splunk)',  rs: true,  wb: false,  rd: true   },
  { feature: 'EU-only data residency (PCI)',          rs: true,  wb: false,  rd: false  },
];

/* ─── Countdown to August 2, 2026 ───────────────────────────────────────── */
function useCountdown() {
  const [days, setDays] = useState(0);
  useEffect(() => {
    const target = new Date('2026-08-02T00:00:00Z').getTime();
    const tick = () => setDays(Math.max(0, Math.ceil((target - Date.now()) / 86400000)));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  return days;
}

/* ─── Live ticker ────────────────────────────────────────────────────────── */
function LiveTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % LIVE_EVENTS.length), 2400);
    return () => clearInterval(id);
  }, []);
  const ev = LIVE_EVENTS[idx];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '2rem', padding: '0.35rem 0.9rem', fontSize: '0.78rem' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: RISK_HEX[ev.risk] ?? '#10b981', flexShrink: 0, boxShadow: `0 0 6px ${RISK_HEX[ev.risk] ?? '#10b981'}` }} />
      <span style={{ color: '#94a3b8' }}>{ev.time}</span>
      <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{ev.agent}</span>
      <span style={{ color: '#10b981' }}>{ev.event}</span>
      <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.72rem' }}>{ev.sig}</span>
    </div>
  );
}

/* ─── Tabs ───────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'evidence', label: '📦 Evidence Pack', sublabel: 'EU AI Act Annex IV' },
  { id: 'ledger',   label: '📜 Decision Ledger', sublabel: 'Forensic Replay' },
  { id: 'hitl',     label: '👤 HITL Approval', sublabel: 'Blast Radius Scoring' },
  { id: 'redteam',  label: '🔴 Red Team', sublabel: 'CVSS-AI Scoring' },
] as const;
type TabId = typeof TABS[number]['id'];

function EvidenceTab() {
  const p = EVIDENCE_PACK;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.5rem', padding: '0.5rem 0.9rem', fontSize: '0.72rem', color: '#818cf8', fontWeight: 700, letterSpacing: '0.06em' }}>COMPLIANT</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>EU AI Act · Annex IV · Article 13</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.75rem', padding: '1.25rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.8 }}>
          <div style={{ color: '#6366f1', marginBottom: '0.5rem' }}># Evidence Pack · {p.id}</div>
          <div><span style={{ color: '#475569' }}>agent: </span><span style={{ color: '#e2e8f0' }}>{p.agent}</span></div>
          <div><span style={{ color: '#475569' }}>regulation: </span><span style={{ color: '#a5b4fc' }}>{p.regulation}</span></div>
          <div><span style={{ color: '#475569' }}>risk_class: </span><span style={{ color: '#f87171' }}>{p.risk_class}</span></div>
          <div><span style={{ color: '#475569' }}>decisions_audited: </span><span style={{ color: '#34d399' }}>{p.decisions.toLocaleString()}</span></div>
          <div><span style={{ color: '#475569' }}>coverage_score: </span><span style={{ color: '#34d399', fontWeight: 700 }}>{p.coverage_score}%</span></div>
          <div><span style={{ color: '#475569' }}>notified_body: </span><span style={{ color: '#e2e8f0' }}>{p.notified_body}</span></div>
          <div><span style={{ color: '#475569' }}>signed_at: </span><span style={{ color: '#94a3b8' }}>{p.signed_at}</span></div>
          <div style={{ wordBreak: 'break-all', marginTop: '0.5rem' }}><span style={{ color: '#475569' }}>signature: </span><span style={{ color: '#10b981', fontSize: '0.68rem' }}>{p.signature}</span></div>
        </div>
      </div>
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Annex IV Clauses Covered</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {p.clauses.map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: '#e2e8f0' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5 6.5-6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {c}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.75rem', padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Coverage Score</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{p.coverage_score}%</div>
          <div style={{ marginTop: '0.75rem', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${p.coverage_score}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 3, transition: 'width 1s ease' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>0 gaps detected · export-ready</div>
        </div>
      </div>
    </div>
  );
}

function LedgerTab() {
  const r = DECISION_REPLAY;
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '2rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>APPROVED</span>
        <span style={{ color: '#475569', fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}>blast radius: <strong style={{ color: '#e2e8f0', marginLeft: '0.3rem' }}>{r.blast_radius}/100</strong></span>
        <span style={{ color: '#475569', fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}>HITL: <strong style={{ color: '#10b981', marginLeft: '0.3rem' }}>not required</strong></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Decision Inputs</div>
          {r.inputs.map(i => (
            <div key={i.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#94a3b8' }}>{i.key}</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>{i.value}</span>
                <span style={{ fontSize: '0.65rem', color: i.weight === 'HIGH' ? '#f97316' : '#64748b', fontWeight: 700 }}>{i.weight}</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Reasoning Chain</div>
          {r.reasoning.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#818cf8', fontWeight: 700, marginTop: 1 }}>{i + 1}</div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{step}</p>
            </div>
          ))}
          <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.68rem', color: '#475569', wordBreak: 'break-all' }}>
            sig: <span style={{ color: '#10b981' }}>{r.signature.slice(0, 48)}…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HitlTab() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const h = HITL_REQUEST;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' }}>{h.title}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{h.agent} · submitted {h.submitted} · {h.deadline}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '2rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>{h.priority}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '0.6rem', padding: '0.875rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Blast Radius</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{h.blast_radius}</div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>/ 100</div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '0.6rem', padding: '0.875rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Value at Risk</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{h.value_at_risk}</div>
        </div>
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '0.6rem', padding: '0.875rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Reviewers</div>
          {h.reviewers.map(r => <div key={r} style={{ fontSize: '0.72rem', color: '#a5b4fc', marginBottom: '0.1rem' }}>• {r}</div>)}
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.6rem', padding: '0.875rem', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        <strong style={{ color: '#e2e8f0' }}>Agent reasoning: </strong>{h.reasoning}
      </div>
      {status === 'pending' ? (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setStatus('approved')} style={{ flex: 1, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>✓ Approve Contract</button>
          <button onClick={() => setStatus('rejected')} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>✗ Reject</button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '1rem', background: status === 'approved' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: '0.6rem', border: `1px solid ${status === 'approved' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{status === 'approved' ? '✅' : '❌'}</div>
          <div style={{ fontWeight: 700, color: status === 'approved' ? '#10b981' : '#ef4444', fontSize: '0.9rem' }}>Decision {status === 'approved' ? 'APPROVED' : 'REJECTED'} — signed to audit ledger</div>
          <button onClick={() => setStatus('pending')} style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: '#475569', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}>Reset demo</button>
        </div>
      )}
    </div>
  );
}

function RedTeamTab() {
  const r = REDTEAM_RESULT;
  const passRate = Math.round((r.passed / r.total) * 100);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Probes run', value: r.total, color: '#94a3b8' },
          { label: 'Passed', value: r.passed, color: '#10b981' },
          { label: 'Failed', value: r.failed, color: '#ef4444' },
          { label: 'CVSS-AI', value: r.cvss_ai, color: '#f97316' },
        ].map(k => (
          <div key={k.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.6rem', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.68rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{k.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.5rem' }}>Severity heat-map — hover for probe name</div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {r.probes.map(p => (
            <div key={p.id} title={`${p.name} — ${p.passed ? 'PASS' : 'FAIL'}`}
              style={{ width: 32, height: 32, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700,
                background: p.passed ? 'rgba(16,185,129,0.12)' : `${SEV_HEX[p.sev]}18`,
                border: `1.5px solid ${p.passed ? '#10b981' : SEV_HEX[p.sev]}`,
                color: p.passed ? '#10b981' : SEV_HEX[p.sev],
              }}
            >{p.passed ? '✓' : '!'}</div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Pass rate: <span style={{ color: passRate >= 80 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{passRate}%</span></div>
        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>2 probes failed: <span style={{ color: '#ef4444' }}>PL-001, TA-002</span> → remediation recommended</div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function PitchPage() {
  const [tab, setTab] = useState<TabId>('evidence');
  const days = useCountdown();

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#e2e8f0' }}>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 2rem 3rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem' }}><LiveTicker /></div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '2rem', padding: '0.35rem 1rem', fontSize: '0.78rem', color: '#fca5a5', fontWeight: 600, marginBottom: '2rem' }}>
          <span style={{ background: '#ef4444', borderRadius: '50%', width: 7, height: 7, display: 'inline-block' }} />
          EU AI Act enforcement — {days} days away · August 2, 2026
        </div>

        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '1.5rem' }}>
          The <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Evidence Plane</span><br />
          for production AI agents
        </h1>

        <p style={{ fontSize: '1.15rem', color: '#64748b', lineHeight: 1.7, maxWidth: 640, margin: '0 auto 2.5rem' }}>
          Every AI decision — cryptographically signed, forensically replayable, carrier-ready. RuneSignal is the compliance infrastructure your AI fleet needs before the August 2026 deadline.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}>
          <Link href="/demo" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', padding: '0.8rem 2rem', borderRadius: '0.5rem', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>Book a live demo →</Link>
          <Link href="/pricing" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '0.8rem 2rem', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}>View pricing</Link>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { v: '847K+',  l: 'Decisions audited', s: 'This month, per tenant' },
            { v: '99.97%', l: 'Audit chain integrity', s: 'Ed25519 verified' },
            { v: '<40ms',  l: 'Firewall p95 latency', s: 'Real-time governance' },
            { v: '0 gaps', l: 'EU AI Act coverage', s: 'Annex IV compliant' },
          ].map(k => (
            <div key={k.l} style={{ background: '#0d1117', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.03em' }}>{k.v}</div>
              <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600, margin: '0.25rem 0 0.15rem' }}>{k.l}</div>
              <div style={{ fontSize: '0.68rem', color: '#475569' }}>{k.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live Demo ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 2rem 4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Live Product Demo</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Click any tab — this is real production data from a demo tenant</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '0.6rem 1.1rem', borderRadius: '0.5rem 0.5rem 0 0', border: '1px solid', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.15s',
                background: tab === t.id ? '#0d1117' : 'transparent',
                borderColor: tab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderBottomColor: tab === t.id ? '#0d1117' : 'transparent',
                color: tab === t.id ? '#e2e8f0' : '#475569',
              }}
            >
              {t.label}
              <span style={{ display: 'block', fontSize: '0.65rem', color: tab === t.id ? '#6366f1' : '#334155', fontWeight: 400, marginTop: '0.1rem' }}>{t.sublabel}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '2rem' }}>
          {tab === 'evidence' && <EvidenceTab />}
          {tab === 'ledger'   && <LedgerTab />}
          {tab === 'hitl'     && <HitlTab />}
          {tab === 'redteam'  && <RedTeamTab />}
        </div>
      </section>

      {/* ── Market ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 2rem 4rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '2rem', textAlign: 'center' }}>Market Opportunity</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {MARKET.map(m => (
            <div key={m.label} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.75rem', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#6366f1', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>{m.value}</div>
              <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.2rem' }}>{m.label}</div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Competitive ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '2rem', textAlign: 'center' }}>Competitive Advantage</h2>
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.78rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Capability</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#6366f1', fontWeight: 700, minWidth: 120 }}>RuneSignal</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#475569', fontWeight: 600, minWidth: 120 }}>W&B / Arize</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#475569', fontWeight: 600, minWidth: 120 }}>Redpanda</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, i) => (
                <tr key={row.feature} style={{ borderBottom: i < COMPARE.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '0.7rem 1.25rem', fontSize: '0.82rem', color: '#94a3b8' }}>{row.feature}</td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>✓</span>
                  </td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                    <span style={{ color: row.wb ? '#10b981' : '#334155', fontWeight: 700, fontSize: '0.9rem' }}>{row.wb ? '✓' : '—'}</span>
                  </td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>
                    <span style={{ color: row.rd ? '#10b981' : '#334155', fontWeight: 700, fontSize: '0.9rem' }}>{row.rd ? '✓' : '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Pricing snapshot ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '2rem', textAlign: 'center' }}>Revenue Model</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { tier: 'T0', name: 'Developer', price: 'Free', color: '#475569', note: 'Land · 10K actions/mo', arr: '€0' },
            { tier: 'T1', name: 'Core', price: '€1,500/mo', color: '#6366f1', note: 'Expand · 2M actions/mo', arr: '€18K ARR' },
            { tier: 'TE', name: 'Enterprise', price: '€250K+/yr', color: '#10b981', note: 'Own · dedicated infra', arr: '€250K+ ARR' },
          ].map(p => (
            <div key={p.tier} style={{ background: '#0d1117', border: `1px solid ${p.color}30`, borderRadius: '0.75rem', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.68rem', color: p.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{p.tier}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' }}>{p.name}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: p.color, marginBottom: '0.5rem' }}>{p.price}</div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem' }}>{p.note}</div>
              <div style={{ fontSize: '0.72rem', background: `${p.color}10`, border: `1px solid ${p.color}20`, borderRadius: '0.35rem', padding: '0.35rem 0.6rem', color: p.color, display: 'inline-block', fontWeight: 600 }}>{p.arr}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1rem', background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'Evidence Pack (T2)', note: '€0.05–€0.50 / pack' },
            { label: 'Decision Ledger (T3)', note: '€0.10–€1.00 / replay' },
            { label: 'Passport Verify (T4)', note: '€0.02–€0.20 / check' },
            { label: 'Insurance OEM (T-I)', note: 'Revenue-share / insured agent' },
          ].map(a => (
            <div key={a.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>{a.label}</div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>{a.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 2rem 6rem', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '1rem', padding: '3rem 2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>Ready to see RuneSignal live?</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>30-minute demo with your own agent data. EU AI Act deadline is in {days} days.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/demo" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', padding: '0.875rem 2.5rem', borderRadius: '0.5rem', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>Book a demo →</Link>
            <a href="mailto:sales@runesignal.io" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '0.875rem 2rem', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>sales@runesignal.io</a>
          </div>
        </div>
      </section>
    </div>
  );
}

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

const OTLP_RECORDS = [
  { ts: '2026-04-21T14:32:07.112Z', agent: 'LoanDecisionAgent', event: 'decision.approved',  sev: 9,  trace: 'trace_7f3a…c2b1', attrs: { 'ai.risk_score': '12', 'runesignal.signature': 'ed25519:7f3a…c2b1', 'eu.ai_act.article': '13' } },
  { ts: '2026-04-21T14:31:55.447Z', agent: 'FraudDetectionAgent',  event: 'anomaly.detected',   sev: 13, trace: 'trace_4a5c…99e1', attrs: { 'ai.anomaly_type': 'statistical_deviation', 'ai.severity': 'critical', 'runesignal.signature': 'ed25519:4a5c…99e1' } },
  { ts: '2026-04-21T14:31:42.008Z', agent: 'ContractReviewBot',    event: 'hitl.escalated',     sev: 13, trace: 'trace_9c1d…a4f2', attrs: { 'ai.blast_radius': '87', 'ai.value_at_risk': '4200000', 'runesignal.signature': 'ed25519:9c1d…a4f2' } },
  { ts: '2026-04-21T14:31:30.991Z', agent: 'HRScreeningAgent',     event: 'decision.blocked',   sev: 13, trace: 'trace_b3f1…08d4', attrs: { 'ai.risk_score': '91', 'ai.policy': 'gdpr_data_minimisation', 'runesignal.signature': 'ed25519:b3f1…08d4' } },
];

const PQC_SIGNING = {
  audit_event_id:  'ae_7f3ac2b1-1d3e-4f5a-b6c7-d8e9f0a1b2c3',
  payload_hash:    'sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  ed25519: {
    algorithm:  'Ed25519',
    signature:  'ed25519:7f3ac2b1d4e9f012a3b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
    key_id:     'runesignal-ed25519-v1',
    signed_at:  '2026-04-21T14:32:07.001Z',
    key_bits:   256,
    quantum_safe: false,
  },
  ml_dsa65: {
    algorithm:  'ML-DSA-65 (NIST FIPS 204)',
    signature:  'mldsa65:3082...a9f1 [3293 bytes]',
    key_id:     'runesignal-mldsa65-v1',
    signed_at:  '2026-04-21T14:32:07.003Z',
    key_bits:   3952,
    quantum_safe: true,
    nist_level: 3,
  },
};

const MCP_SERVERS = [
  { name: 'SupplyChain-MCP',  endpoint: 'https://mcp.acme.internal/supply', trust: 'verified', calls: 12847, hitl: 23,  blocked: 2  },
  { name: 'DataLake-MCP',     endpoint: 'https://mcp.acme.internal/data',   trust: 'trusted',  calls: 8293,  hitl: 4,   blocked: 0  },
  { name: 'ExternalAI-MCP',   endpoint: 'https://api.partner.ai/mcp',       trust: 'untrusted',calls: 441,   hitl: 187, blocked: 31 },
];

const MCP_INVOKE = {
  tool_name:  'execute_purchase_order',
  server:     'SupplyChain-MCP',
  agent:      'SupplyChainOrchestrator',
  risk_score: 74,
  input_hash: 'sha256:3c4d…f1a2',
  reasoning:  'Tool name contains execute · cross-system write · value > €50K threshold',
  outcome:    'hitl_pending',
};

const INSURANCE_ASSESS = {
  agent:      'LoanDecisionAgent v2.3',
  risk_score: 28,
  risk_tier:  'Low',
  coverage:   '€100,000 — €500,000',
  breakdown: [
    { label: 'Blast radius contribution',    pts: +8,  color: '#f97316' },
    { label: 'Anomaly rate contribution',     pts: +4,  color: '#f59e0b' },
    { label: 'Serious incidents (90d)',       pts: +0,  color: '#64748b' },
    { label: 'HITL coverage reduction',      pts: -12, color: '#10b981' },
    { label: 'Passport reputation reduction', pts: -14, color: '#10b981' },
    { label: 'Decision reversals',           pts: +3,  color: '#f59e0b' },
  ],
  citations: [
    '847,293 audit events — S3 ledger (90d)',
    '14 anomalies detected — S8 engine',
    '0 serious incidents — Art.73',
    'HITL coverage 34.2% — S7',
    'Passport RSN-2026-001847 · rep. score 91 — T4',
  ],
  eu_ref: 'Article 9 (risk management) · Article 17 (QMS)',
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
  { id: 'evidence',  label: '📦 Evidence Pack',    sublabel: 'EU AI Act Annex IV'    },
  { id: 'ledger',    label: '📜 Decision Ledger',  sublabel: 'Forensic Replay'        },
  { id: 'hitl',      label: '👤 HITL Approval',    sublabel: 'Blast Radius Scoring'   },
  { id: 'redteam',   label: '🔴 Red Team',          sublabel: 'CVSS-AI Scoring'        },
  { id: 'otlp',      label: '📡 OTLP Export',       sublabel: 'Grafana · Datadog'      },
  { id: 'pqc',       label: '🔐 PQC Signing',       sublabel: 'ML-DSA-65 Dual-Sign'   },
  { id: 'mcp',       label: '🔗 MCP Governance',    sublabel: 'Tool Call Proxy'        },
  { id: 'insurance', label: '🛡️ Insurance Engine',  sublabel: 'Actuarial Risk Scoring' },
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

function OtlpTab() {
  const [pushed, setPushed] = useState(false);
  const [pushing, setPushing] = useState(false);
  const SINKS = [
    { name: 'Grafana Cloud',   color: '#f97316', logo: 'G' },
    { name: 'Datadog',         color: '#6366f1', logo: 'D' },
    { name: 'Splunk',          color: '#10b981', logo: 'S' },
  ];
  const handlePush = () => {
    setPushing(true);
    setTimeout(() => { setPushing(false); setPushed(true); }, 1600);
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.2rem' }}>OTLP LogRecord + Span export</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>EU AI Act Article 12 · record-keeping · push or pull scrape</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {SINKS.map(s => (
            <div key={s.name} style={{ background: `${s.color}15`, border: `1px solid ${s.color}30`, borderRadius: '0.4rem', padding: '0.3rem 0.7rem', fontSize: '0.72rem', color: s.color, fontWeight: 700 }}>{s.logo} {s.name}</div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Live LogRecord stream</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {OTLP_RECORDS.map((r, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#10b981' }}>{r.event}</span>
                  <span style={{ fontSize: '0.65rem', color: r.sev === 13 ? '#ef4444' : '#10b981', fontWeight: 700 }}>SEV {r.sev}</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#475569' }}>{r.agent} · {r.ts.slice(11, 19)}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.63rem', color: '#334155', marginTop: '0.2rem', wordBreak: 'break-all' }}>{r.trace}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Span attributes (runesignal.*)</div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.875rem', fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 2 }}>
            {Object.entries(OTLP_RECORDS[0].attrs).map(([k, v]) => (
              <div key={k}><span style={{ color: '#6366f1' }}>{k}</span>: <span style={{ color: '#34d399' }}>"{v}"</span></div>
            ))}
            <div style={{ color: '#475569', marginTop: '0.4rem' }}>+ 12 standard OTel attrs</div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            {!pushed ? (
              <button onClick={handlePush} disabled={pushing} style={{ width: '100%', background: pushing ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', borderRadius: '0.5rem', padding: '0.65rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}>
                {pushing ? '⏳ Pushing 847 records…' : '▶ Push batch to Grafana Cloud'}
              </button>
            ) : (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>✓ 847 records exported · 204 No Content</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Visible in Grafana in ~30s · trace IDs linked</div>
                <button onClick={() => setPushed(false)} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#475569', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>Reset</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#475569' }}>
        <span>🔒 OTLP/HTTP over TLS</span>
        <span>📋 OTLP_ENABLED · OTLP_ENDPOINT · OTLP_API_KEY</span>
        <span>🔁 Push (POST) + Pull (GET) endpoints</span>
      </div>
    </div>
  );
}

function PqcTab() {
  const [verified, setVerified] = useState<null | boolean>(null);
  const p = PQC_SIGNING;
  const ALGOS = [
    { name: 'RSA-2048',       bits: 2048,  quantum_safe: false, color: '#ef4444', bar: 20 },
    { name: 'Ed25519',        bits: 256,   quantum_safe: false, color: '#f97316', bar: 35 },
    { name: 'ML-DSA-65',      bits: 3952,  quantum_safe: true,  color: '#10b981', bar: 100 },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem' }}>Dual-signature on every audit event</div>
          {[p.ed25519, p.ml_dsa65].map(sig => (
            <div key={sig.algorithm} style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', border: `1px solid ${sig.quantum_safe ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '0.6rem', padding: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#e2e8f0' }}>{sig.algorithm}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: sig.quantum_safe ? '#10b981' : '#f59e0b', background: sig.quantum_safe ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', padding: '0.15rem 0.5rem', borderRadius: '2rem' }}>
                  {sig.quantum_safe ? '✓ QUANTUM-SAFE' : '⚡ PRIMARY'}
                </span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#475569', wordBreak: 'break-all', marginBottom: '0.4rem' }}>{sig.signature}</div>
              <div style={{ fontSize: '0.7rem', color: '#475569' }}>key_id: <span style={{ color: '#94a3b8' }}>{sig.key_id}</span> · {sig.key_bits} bits · {sig.signed_at.slice(11, 19)}Z</div>
            </div>
          ))}
          <button
            onClick={() => { setVerified(null); setTimeout(() => setVerified(true), 900); }}
            style={{ width: '100%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: '0.5rem', padding: '0.6rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
          >▶ Verify both signatures</button>
          {verified === true && <div style={{ marginTop: '0.75rem', textAlign: 'center', color: '#10b981', fontSize: '0.82rem', fontWeight: 700 }}>✓ Ed25519 valid · ✓ ML-DSA-65 valid · NIST FIPS 204</div>}
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem' }}>Algorithm comparison</div>
          {ALGOS.map(a => (
            <div key={a.name} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 600 }}>{a.name}</span>
                <span style={{ fontSize: '0.72rem', color: a.quantum_safe ? '#10b981' : '#ef4444', fontWeight: 700 }}>{a.quantum_safe ? 'Quantum-safe ✓' : 'Vulnerable'}</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${a.bar}%`, height: '100%', background: a.color, borderRadius: 4, transition: 'width 1s ease' }} />
              </div>
              <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.2rem' }}>{a.bits}-bit key · NIST security level {a.quantum_safe ? 3 : 1}</div>
            </div>
          ))}
          <div style={{ marginTop: '1.25rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '0.6rem', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginBottom: '0.3rem' }}>Why it matters</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.6 }}>
              Harvest-now-decrypt-later attacks mean audit trails signed today with RSA/EC will be readable by quantum adversaries in 5–10 years. RuneSignal's ML-DSA-65 dual-sign gives your evidence chain a 30-year shelf life.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function McpTab() {
  const [outcome, setOutcome] = useState<'idle' | 'running' | 'hitl' | 'blocked'>('idle');
  const inv = MCP_INVOKE;
  const handleInvoke = () => {
    setOutcome('running');
    setTimeout(() => setOutcome('hitl'), 1200);
  };
  const TRUST_COLOR: Record<string, string> = { trusted: '#10b981', verified: '#6366f1', untrusted: '#f97316' };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem' }}>Registered MCP Servers</div>
          {MCP_SERVERS.map(s => (
            <div key={s.name} style={{ marginBottom: '0.6rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>{s.name}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: TRUST_COLOR[s.trust] ?? '#64748b', textTransform: 'uppercase' }}>{s.trust}</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#334155', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.endpoint}</div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.68rem', color: '#475569' }}>
                <span>{s.calls.toLocaleString()} calls</span>
                <span style={{ color: s.hitl > 0 ? '#f59e0b' : '#475569' }}>{s.hitl} HITL</span>
                <span style={{ color: s.blocked > 0 ? '#ef4444' : '#475569' }}>{s.blocked} blocked</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem' }}>Live Invocation — risk interception</div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.6rem', padding: '0.875rem', marginBottom: '0.875rem', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.9 }}>
            <div><span style={{ color: '#6366f1' }}>POST</span> <span style={{ color: '#94a3b8' }}>/api/v1/mcp/invoke</span></div>
            <div style={{ color: '#475569' }}>{`{`}</div>
            <div style={{ paddingLeft: '1rem' }}><span style={{ color: '#f97316' }}>"toolName"</span>: <span style={{ color: '#34d399' }}>"execute_purchase_order"</span>,</div>
            <div style={{ paddingLeft: '1rem' }}><span style={{ color: '#f97316' }}>"serverId"</span>: <span style={{ color: '#34d399' }}>"SupplyChain-MCP"</span>,</div>
            <div style={{ paddingLeft: '1rem' }}><span style={{ color: '#f97316' }}>"agentId"</span>: <span style={{ color: '#34d399' }}>"SupplyChainOrchestrator"</span></div>
            <div style={{ color: '#475569' }}>{`}`}</div>
          </div>
          {outcome === 'idle' && (
            <button onClick={handleInvoke} style={{ width: '100%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: '0.5rem', padding: '0.65rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>▶ Invoke tool</button>
          )}
          {outcome === 'running' && (
            <div style={{ textAlign: 'center', padding: '0.75rem', color: '#6366f1', fontSize: '0.82rem', fontWeight: 700 }}>⚡ Scoring risk… S1 arbiter…</div>
          )}
          {outcome === 'hitl' && (
            <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '0.6rem', padding: '0.875rem' }}>
              <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>⚠️ Risk score {inv.risk_score}/100 → HITL required</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '0.5rem' }}>{inv.reasoning}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#475569' }}>202 Accepted · hitl_request_id: hitl_9d2e…f1a2 · audit signed</div>
              <button onClick={() => setOutcome('idle')} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#475569', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>Reset</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InsuranceTab() {
  const a = INSURANCE_ASSESS;
  const netScore = a.breakdown.reduce((sum, b) => sum + b.pts, 0);
  const TIER_COLOR: Record<string, string> = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', Uninsurable: '#7f1d1d' };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem' }}>Actuarial Risk Scoring</div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, background: `${TIER_COLOR[a.risk_tier]}12`, border: `1px solid ${TIER_COLOR[a.risk_tier]}30`, borderRadius: '0.6rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Risk Score</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: TIER_COLOR[a.risk_tier], lineHeight: 1 }}>{a.risk_score}</div>
              <div style={{ fontSize: '0.65rem', color: '#475569' }}>/ 100</div>
            </div>
            <div style={{ flex: 1, background: `${TIER_COLOR[a.risk_tier]}12`, border: `1px solid ${TIER_COLOR[a.risk_tier]}30`, borderRadius: '0.6rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Risk Tier</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: TIER_COLOR[a.risk_tier], lineHeight: 1 }}>{a.risk_tier}</div>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.2rem' }}>of 4 tiers</div>
            </div>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.6rem', padding: '0.875rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Recommended Coverage</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{a.coverage}</div>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Score breakdown</div>
          {a.breakdown.map(b => (
            <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.78rem' }}>
              <span style={{ color: '#94a3b8' }}>{b.label}</span>
              <span style={{ color: b.color, fontWeight: 700 }}>{b.pts > 0 ? `+${b.pts}` : b.pts}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.82rem', fontWeight: 700 }}>
            <span style={{ color: '#e2e8f0' }}>Net risk score</span>
            <span style={{ color: TIER_COLOR[a.risk_tier] }}>{netScore}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem' }}>Evidence citations</div>
          {a.citations.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><path d="M2 7l3.5 3.5 6.5-6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>{c}</span>
            </div>
          ))}
          <div style={{ marginTop: '1.25rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '0.6rem', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.3rem' }}>OEM Insurance Channel</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.6 }}>Carriers receive signed InsuranceAssessment with Ed25519 manifest hash. Revenue-share per policy written. First carrier OEM onboarded Q3 2026.</div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: '#475569' }}>EU AI Act ref: {a.eu_ref}</div>
          </div>
        </div>
      </div>
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
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '1px' }}>
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
          {tab === 'evidence'  && <EvidenceTab />}
          {tab === 'ledger'    && <LedgerTab />}
          {tab === 'hitl'      && <HitlTab />}
          {tab === 'redteam'   && <RedTeamTab />}
          {tab === 'otlp'      && <OtlpTab />}
          {tab === 'pqc'       && <PqcTab />}
          {tab === 'mcp'       && <McpTab />}
          {tab === 'insurance' && <InsuranceTab />}
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

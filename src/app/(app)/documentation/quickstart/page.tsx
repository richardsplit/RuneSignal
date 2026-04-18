'use client';

import { useState } from 'react';

type Lang = 'node' | 'python' | 'curl';

const CODE_SAMPLES: Record<
  string,
  Record<Lang, string>
> = {
  install: {
    node: `npm install @runesignal/sdk`,
    python: `pip install runesignal`,
    curl: `# No installation needed — use cURL directly`,
  },
  init: {
    node: `import { RuneSignalClient } from '@runesignal/sdk';

const tl = new RuneSignalClient({
  apiKey: 'tl_your_api_key_here',
  // Optional: pre-set a default agent
  // agentId: 'your-agent-uuid',
});`,
    python: `from runesignal import RuneSignalClient

tl = RuneSignalClient(
    api_key="tl_your_api_key_here",
    # agent_id="your-agent-uuid",  # optional default
)`,
    curl: `# Set your API key and base URL
export TL_API_KEY="tl_your_api_key_here"
export TL_BASE="https://your-runesignal-instance.com"`,
  },
  register: {
    node: `const agent = await tl.agents.register({
  name: 'Invoice Processor v2',
  description: 'Processes vendor invoices and routes for approval',
  model: 'gpt-4o',
  permissions: [
    'finance:read',
    'finance:write',
    'erp:create_journal_entry',
  ],
});

console.log('Agent ID:', agent.id);
console.log('Agent Token:', agent.token);`,
    python: `agent = await tl.agents.register(
    name="Invoice Processor v2",
    description="Processes vendor invoices and routes for approval",
    model="gpt-4o",
    permissions=[
        "finance:read",
        "finance:write",
        "erp:create_journal_entry",
    ],
)

print(f"Agent ID: {agent.id}")
print(f"Agent Token: {agent.token}")`,
    curl: `curl -X POST "$TL_BASE/api/v1/agents/register" \\
  -H "Authorization: Bearer $TL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Invoice Processor v2",
    "description": "Processes vendor invoices",
    "model": "gpt-4o",
    "permissions": ["finance:read", "finance:write"]
  }'`,
  },
  evaluate: {
    node: `// Evaluate an agent action before executing it
const result = await tl.firewall.evaluate({
  agentId: agent.id,
  action: 'create_journal_entry',
  resource: 'erp://journal/entries',
  description: 'Create journal entry for invoice INV-2024-0042',
  domain: 'finance',
  metadata: {
    amount: 12500,
    currency: 'USD',
    vendor: 'Acme Corp',
  },
  riskThreshold: 70,
});

if (result.verdict === 'allow') {
  console.log('✅ Action approved — proceeding');
  // Execute your action here
} else if (result.verdict === 'escalate') {
  console.log('⏳ Escalated to human review');
  console.log('HITL ticket:', result.hitlTicketId);
  // Wait for human approval before proceeding
} else {
  console.log('🚫 Action blocked');
  console.log('Reasons:', result.reasons);
}`,
    python: `# Evaluate an agent action before executing it
result = await tl.firewall.evaluate(
    agent_id=agent.id,
    action="create_journal_entry",
    resource="erp://journal/entries",
    description="Create journal entry for invoice INV-2024-0042",
    domain="finance",
    metadata={
        "amount": 12500,
        "currency": "USD",
        "vendor": "Acme Corp",
    },
    risk_threshold=70,
)

if result.verdict == "allow":
    print("✅ Action approved — proceeding")
    # Execute your action here
elif result.verdict == "escalate":
    print("⏳ Escalated to human review")
    print(f"HITL ticket: {result.hitl_ticket_id}")
    # Wait for human approval
else:
    print("🚫 Action blocked")
    print("Reasons:", result.reasons)`,
    curl: `curl -X POST "$TL_BASE/api/v1/firewall/evaluate" \\
  -H "Authorization: Bearer $TL_API_KEY" \\
  -H "X-Agent-Id: $AGENT_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "create_journal_entry",
    "resource": "erp://journal/entries",
    "description": "Create journal entry for invoice INV-2024-0042",
    "domain": "finance",
    "metadata": { "amount": 12500 },
    "risk_threshold": 70
  }'`,
  },
  certify: {
    node: `// Create a cryptographically-signed provenance certificate
const cert = await tl.provenance.certify({
  agentId: agent.id,
  action: 'create_journal_entry',
  resource: 'erp://journal/entries/JE-9981',
  outcome: 'success',
  metadata: {
    journal_entry_id: 'JE-9981',
    amount: 12500,
    approved_by: 'cfo@company.com',
  },
});

console.log('Certificate ID:', cert.id);
console.log('Ed25519 Signature:', cert.signature);`,
    python: `# Create a cryptographically-signed provenance certificate
cert = await tl.provenance.certify(
    agent_id=agent.id,
    action="create_journal_entry",
    resource="erp://journal/entries/JE-9981",
    outcome="success",
    metadata={
        "journal_entry_id": "JE-9981",
        "amount": 12500,
        "approved_by": "cfo@company.com",
    },
)

print(f"Certificate ID: {cert.id}")
print(f"Ed25519 Signature: {cert.signature}")`,
    curl: `curl -X POST "$TL_BASE/api/v1/provenance/certify" \\
  -H "Authorization: Bearer $TL_API_KEY" \\
  -H "X-Agent-Id: $AGENT_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "create_journal_entry",
    "resource": "erp://journal/entries/JE-9981",
    "outcome": "success",
    "metadata": { "journal_entry_id": "JE-9981" }
  }'`,
  },
};

const STEPS = [
  {
    id: 'install',
    title: '1. Install the SDK',
    description: 'Add RuneSignal to your project using your package manager.',
  },
  {
    id: 'init',
    title: '2. Initialize the client',
    description:
      'Create a client with your API key. Generate keys in Account Settings → API Keys.',
  },
  {
    id: 'register',
    title: '3. Register an agent',
    description:
      'Register your AI agent with the scopes it needs. This creates a tracked identity.',
  },
  {
    id: 'evaluate',
    title: '4. Evaluate actions before executing',
    description:
      'Call the firewall before every consequential agent action. Gets a verdict in <500ms.',
  },
  {
    id: 'certify',
    title: '5. Certify completed actions',
    description:
      'Create Ed25519-signed provenance certificates for completed actions. Immutable audit trail.',
  },
];

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative', background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--surface-3)', borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="t-mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{language}</span>
        <button className="btn btn-ghost" onClick={handleCopy} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '1rem', overflowX: 'auto', fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function QuickstartPage() {
  const [lang, setLang] = useState<Lang>('node');

  const langLabels: Record<Lang, string> = {
    node: 'Node.js',
    python: 'Python',
    curl: 'cURL',
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-success" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>Quickstart</span>
        <h1 className="page-title" style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Protect your first AI agent in 5 minutes</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
          RuneSignal is the AI Agent Action Firewall — a policy evaluation layer that sits between
          your AI agent and consequential actions. Every action is checked against your policies,
          risk profile, and compliance rules before execution.
        </p>
      </div>

      {/* Language tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', position: 'sticky', top: 0, zIndex: 10, background: 'var(--canvas)', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
        {(Object.keys(langLabels) as Lang[]).map(l => (
          <button key={l} onClick={() => setLang(l)} className={`btn ${lang === l ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.8125rem' }}>
            {langLabels[l]}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {STEPS.map((step, idx) => (
          <div key={step.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: 'var(--text-inverse)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
                {idx + 1}
              </div>
              <div>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '0.25rem 0' }}>{step.title.replace(/^\d+\.\s/, '')}</h2>
                <p className="t-body-sm text-secondary" style={{ margin: 0 }}>{step.description}</p>
              </div>
            </div>
            <CodeBlock code={CODE_SAMPLES[step.id][lang]} language={lang === 'node' ? 'TypeScript' : lang === 'python' ? 'Python' : 'Shell'} />
          </div>
        ))}
      </div>

      {/* Response format */}
      <div style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Firewall Response Format</h2>
        <p className="t-body-sm text-secondary" style={{ marginBottom: '1rem' }}>
          Every call to <code className="t-mono" style={{ color: 'var(--accent)' }}>/api/v1/firewall/evaluate</code> returns a structured verdict with full reasoning.
        </p>
        <CodeBlock
          language="JSON"
          code={`{
  "evaluation_id": "eval_01hx4b...",
  "verdict": "allow",          // "allow" | "block" | "escalate"
  "risk_score": 23,            // 0–100
  "checks": [
    { "module": "s6_identity",  "passed": true,  "score": 0   },
    { "module": "s1_policy",    "passed": true,  "score": 15  },
    { "module": "s8_moral",     "passed": true,  "score": 0   },
    { "module": "s5_risk",      "passed": true,  "score": 23  }
  ],
  "reasons": [],
  "certificate_id": "cert_9xk2...",  // set if action was certified
  "hitl_ticket_id": null,            // set if escalated
  "latency_ms": 87
}`}
        />
      </div>

      {/* Links */}
      <div className="surface" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
        {[
          { icon: '📖', title: 'Full API Reference', desc: 'Complete documentation for all 30+ API endpoints with interactive Try It console.', href: '/documentation', cta: 'Open API Reference →' },
          { icon: '🔑', title: 'Get an API Key', desc: 'Generate an API key from your account settings to authenticate SDK and API calls.', href: '/account-settings', cta: 'Account Settings →' },
          { icon: '🛡️', title: 'Policy Packs', desc: 'Install pre-built HIPAA, SOX, GDPR, or PCI-DSS policy packs with one click.', href: '/policies', cta: 'Browse Policy Packs →' },
          { icon: '⚙️', title: 'Integrate Approvals', desc: 'Connect Slack, Teams, Jira, or ServiceNow for interactive HITL approval workflows.', href: '/account-settings/integrations', cta: 'Configure Integrations →' },
        ].map(item => (
          <div key={item.href}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{item.icon} {item.title}</div>
            <div className="t-caption" style={{ marginBottom: '0.5rem' }}>{item.desc}</div>
            <a href={item.href} style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>{item.cta}</a>
          </div>
        ))}
      </div>
    </div>
  );
}

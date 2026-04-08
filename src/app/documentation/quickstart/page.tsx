'use client';

import { useState } from 'react';

type Lang = 'node' | 'python' | 'curl';

const CODE_SAMPLES: Record<
  string,
  Record<Lang, string>
> = {
  install: {
    node: `npm install @trustlayer/sdk`,
    python: `pip install trustlayer`,
    curl: `# No installation needed — use cURL directly`,
  },
  init: {
    node: `import { TrustLayerClient } from '@trustlayer/sdk';

const tl = new TrustLayerClient({
  apiKey: 'tl_your_api_key_here',
  // Optional: pre-set a default agent
  // agentId: 'your-agent-uuid',
});`,
    python: `from trustlayer import TrustLayerClient

tl = TrustLayerClient(
    api_key="tl_your_api_key_here",
    # agent_id="your-agent-uuid",  # optional default
)`,
    curl: `# Set your API key and base URL
export TL_API_KEY="tl_your_api_key_here"
export TL_BASE="https://your-trustlayer-instance.com"`,
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
    description: 'Add TrustLayer to your project using your package manager.',
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
    <div
      style={{
        position: 'relative',
        background: '#0d1117',
        border: '1px solid #21262d',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          background: '#161b22',
          borderBottom: '1px solid #21262d',
        }}
      >
        <span style={{ fontSize: 11, color: '#8b949e', fontFamily: 'monospace' }}>
          {language}
        </span>
        <button
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: '1px solid #30363d',
            borderRadius: 4,
            color: '#8b949e',
            padding: '3px 10px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '16px',
          overflowX: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
          color: '#c9d1d9',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      >
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
    <div
      style={{
        color: '#e5e5e5',
        fontFamily: 'Inter, system-ui, sans-serif',
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 32px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            display: 'inline-block',
            background: '#10b981',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1,
            padding: '3px 10px',
            borderRadius: 3,
            marginBottom: 12,
          }}
        >
          Quickstart
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 12px' }}>
          Protect your first AI agent in 5 minutes
        </h1>
        <p style={{ color: '#737373', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          TrustLayer is the AI Agent Action Firewall — a policy evaluation layer that sits between
          your AI agent and consequential actions. Every action is checked against your policies,
          risk profile, and compliance rules before execution.
        </p>
      </div>

      {/* Language tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 32,
          position: 'sticky',
          top: 16,
          zIndex: 10,
          background: '#0a0a0a',
          padding: '12px 0',
          borderBottom: '1px solid #2a2a2a',
        }}
      >
        {(Object.keys(langLabels) as Lang[]).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              background: lang === l ? '#10b981' : '#1a1a1a',
              border: `1px solid ${lang === l ? '#10b981' : '#2a2a2a'}`,
              borderRadius: 6,
              color: lang === l ? '#fff' : '#a3a3a3',
              padding: '7px 16px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {langLabels[l]}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {STEPS.map((step, idx) => (
          <div key={step.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 4px' }}>
                  {step.title.replace(/^\d+\.\s/, '')}
                </h2>
                <p style={{ color: '#737373', fontSize: 14, margin: 0 }}>
                  {step.description}
                </p>
              </div>
            </div>
            <CodeBlock
              code={CODE_SAMPLES[step.id][lang]}
              language={lang === 'node' ? 'TypeScript' : lang === 'python' ? 'Python' : 'Shell'}
            />
          </div>
        ))}
      </div>

      {/* Response format */}
      <div style={{ marginTop: 56, marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Firewall Response Format
        </h2>
        <p style={{ color: '#737373', fontSize: 14, marginBottom: 20 }}>
          Every call to <code style={{ color: '#10b981' }}>/api/v1/firewall/evaluate</code> returns
          a structured verdict with full reasoning.
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
      <div
        style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: 24,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginTop: 40,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            📖 Full API Reference
          </div>
          <div style={{ fontSize: 12, color: '#737373' }}>
            Complete documentation for all 30+ API endpoints with interactive Try It console.
          </div>
          <a
            href="/documentation"
            style={{ display: 'block', fontSize: 12, color: '#10b981', marginTop: 8 }}
          >
            Open API Reference →
          </a>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            🔑 Get an API Key
          </div>
          <div style={{ fontSize: 12, color: '#737373' }}>
            Generate an API key from your account settings to authenticate SDK and API calls.
          </div>
          <a
            href="/account-settings"
            style={{ display: 'block', fontSize: 12, color: '#10b981', marginTop: 8 }}
          >
            Account Settings →
          </a>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            🛡️ Policy Packs
          </div>
          <div style={{ fontSize: 12, color: '#737373' }}>
            Install pre-built HIPAA, SOX, GDPR, or PCI-DSS policy packs with one click.
          </div>
          <a
            href="/policies"
            style={{ display: 'block', fontSize: 12, color: '#10b981', marginTop: 8 }}
          >
            Browse Policy Packs →
          </a>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            ⚙️ Integrate Approvals
          </div>
          <div style={{ fontSize: 12, color: '#737373' }}>
            Connect Slack, Teams, Jira, or ServiceNow for interactive HITL approval workflows.
          </div>
          <a
            href="/account-settings/integrations"
            style={{ display: 'block', fontSize: 12, color: '#10b981', marginTop: 8 }}
          >
            Configure Integrations →
          </a>
        </div>
      </div>
    </div>
  );
}

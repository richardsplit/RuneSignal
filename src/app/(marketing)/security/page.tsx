export const metadata = {
  title: 'Security & Trust | RuneSignal',
  description: 'RuneSignal security architecture: Ed25519 cryptographic signing, RLS tenant isolation, MFA AAL2, rate limiting, and append-only audit ledger.',
};

const LAST_UPDATED = 'April 2026';

export default function SecurityPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#080812',
      color: '#e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    }}>
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          a { color: #10b981 !important; }
        }
      `}</style>

      {/* Nav — hidden in print */}
      <div className="no-print" style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <a href="/" style={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981', textDecoration: 'none' }}>
          RuneSignal
        </a>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
          <a href="/legal/dpa" style={{ color: '#64748b', textDecoration: 'none' }}>DPA</a>
          <a href="/legal/sla" style={{ color: '#64748b', textDecoration: 'none' }}>SLA</a>
          <a href="/security" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>Security</a>
          <a href="/login" style={{ color: '#64748b', textDecoration: 'none' }}>Sign In</a>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10b981', marginBottom: '0.75rem' }}>
            Security & Trust
          </p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2, marginBottom: '1rem' }}>
            RuneSignal Architecture Trust Document
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.7 }}>
            Last updated: {LAST_UPDATED} &nbsp;·&nbsp; For use in security questionnaires, vendor assessments, and enterprise due diligence.
          </p>
          <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.75rem' }}>
            This document describes the technical security controls implemented in the RuneSignal platform. It is not a penetration test report. A formal pentest programme is planned for Q3 2026 via a HackerOne managed engagement.
          </p>
        </div>

        {/* Summary badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
          {[
            { label: 'Signing', value: 'Ed25519' },
            { label: 'Isolation', value: 'RLS per tenant' },
            { label: 'Auth', value: 'MFA AAL2' },
            { label: 'Encryption', value: 'AES-256 + TLS' },
            { label: 'Ledger', value: 'Append-only' },
          ].map(b => (
            <div key={b.label} style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '8px',
              padding: '1rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>{b.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{b.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          {/* 1. Cryptographic Provenance */}
          <Section title="1. Cryptographic Signing — Ed25519" accent="#10b981">
            <p>
              Every event written to the RuneSignal audit ledger is signed with an <strong>Ed25519</strong> private key before persistence. Ed25519 (RFC 8032) provides 128-bit security with deterministic signatures — suitable for court-admissible audit trails and regulator-presentable evidence packages.
            </p>
            <Detail label="Signing key">Ed25519 keypair, generated at tenant provisioning time. Private key stored as an environment secret, never persisted to the database.</Detail>
            <Detail label="Signed payload">SHA-256 hash of <code>tenant_id + agent_id + event_type + timestamp + data_hash</code> — the concatenated canonical string is signed before insert.</Detail>
            <Detail label="Verification">Public key exposed via <code>GET /api/v1/verify/pubkey</code>. Any party can independently verify a signature without contacting RuneSignal.</Detail>
            <Detail label="Immutability">Audit events are insert-only at the database layer. No UPDATE or DELETE is permitted on the <code>audit_events</code> table. The RLS policy enforces this at the Postgres level regardless of application code.</Detail>
            <Detail label="Post-quantum readiness">A stub ML-DSA-65 (NIST FIPS 204) dual-signing path exists behind the <code>ENABLE_PQC</code> feature flag. Not marketed until fully implemented and independently audited.</Detail>
          </Section>

          {/* 2. Tenant Isolation */}
          <Section title="2. Tenant Data Isolation — Row-Level Security" accent="#3b82f6">
            <p>
              RuneSignal is a multi-tenant SaaS. Every database table that stores customer data includes a <code>tenant_id</code> foreign key referencing the <code>tenants</code> table. Isolation is enforced at the <strong>Postgres RLS layer</strong> — not only in application code.
            </p>
            <Detail label="Enforcement point">Supabase PostgreSQL Row-Level Security policies on every tenant-scoped table. Even if application code contains a bug, a query from Tenant A cannot return rows belonging to Tenant B.</Detail>
            <Detail label="Policy pattern">
              {`CREATE POLICY tenant_isolation ON [table] FOR ALL\nUSING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));`}
            </Detail>
            <Detail label="Admin operations">Backend service operations (audit writes, webhook delivery, NHI rotation) use a Supabase service-role client that bypasses RLS. This client is never exposed to the browser or API consumers.</Detail>
            <Detail label="API key isolation">API keys are stored as SHA-256 hashes. Middleware resolves a key to its <code>tenant_id</code> at the edge and injects it as an <code>X-Tenant-Id</code> header. All downstream queries are scoped to that tenant ID.</Detail>
            <Detail label="Verification">Customers can verify tenant isolation by inspecting the migration files at <code>supabase/migrations/</code> in the public GitHub repository.</Detail>
          </Section>

          {/* 3. Authentication */}
          <Section title="3. Authentication — MFA AAL2 Enforcement" accent="#8b5cf6">
            <p>
              All RuneSignal dashboard access requires a valid Supabase session. If a user has enrolled a TOTP factor, the platform enforces <strong>Authenticator Assurance Level 2 (AAL2)</strong> before any dashboard route is accessible.
            </p>
            <Detail label="MFA method">TOTP (RFC 6238) via Supabase Auth. Compatible with Google Authenticator, Authy, 1Password, and any RFC 6238-compliant app.</Detail>
            <Detail label="AAL2 enforcement">Middleware calls <code>supabase.auth.mfa.getAuthenticatorAssuranceLevel()</code> on every request. If <code>nextLevel === 'aal2'</code> and <code>currentLevel !== 'aal2'</code>, the user is redirected to the MFA challenge page — regardless of session validity.</Detail>
            <Detail label="API key auth">Machine-to-machine access uses scoped API keys (<code>tl_*</code> prefix). Keys are stored as SHA-256 hashes. The plaintext key is shown exactly once at generation time.</Detail>
            <Detail label="Session handling">Sessions managed by Supabase Auth (JWT, httpOnly cookies). Token refresh handled server-side via <code>@supabase/ssr</code>. No tokens stored in localStorage.</Detail>
            <Detail label="Brute force protection">Supabase Auth enforces rate limits on authentication attempts at the infrastructure level. Application-level rate limiting via Upstash Redis (100 req/min per tenant) provides additional protection.</Detail>
          </Section>

          {/* 4. Encryption */}
          <Section title="4. Encryption — At Rest and In Transit" accent="#f59e0b">
            <p>
              All customer data is encrypted both at rest and in transit. RuneSignal does not operate its own database infrastructure — storage is delegated to Supabase (Postgres on AWS), which provides managed encryption.
            </p>
            <Detail label="Encryption at rest">AES-256 via Supabase PostgreSQL on AWS RDS. Managed key rotation handled by AWS KMS. No plaintext data written to disk.</Detail>
            <Detail label="Encryption in transit">TLS 1.2 minimum enforced on all endpoints. TLS 1.3 supported and preferred. Vercel enforces HTTPS for all deployments; HTTP requests are automatically redirected.</Detail>
            <Detail label="Secret management">Application secrets (service role key, Ed25519 private key, Stripe key, CRON secret) stored as environment variables in Vercel. Never committed to source control. <code>.env*</code> files are in <code>.gitignore</code>.</Detail>
            <Detail label="API key storage">API keys hashed with SHA-256 before database insert. The hash is used for verification; the plaintext key is never stored.</Detail>
          </Section>

          {/* 5. Rate Limiting */}
          <Section title="5. Rate Limiting and API Abuse Prevention" accent="#ef4444">
            <p>
              RuneSignal applies rate limiting at the edge (middleware layer) before any request reaches application code or the database.
            </p>
            <Detail label="Per-tenant rate limit">100 requests per minute per tenant, enforced via Upstash Redis sliding window algorithm at the Next.js middleware layer.</Detail>
            <Detail label="Plan-based limits">API usage is metered per tenant per month. Tenants exceeding their plan limit receive HTTP 429 with an upgrade URL. Prevents runaway agent loops from consuming unbounded resources.</Detail>
            <Detail label="CRON endpoint security">All scheduled job endpoints (<code>/api/cron/*</code>) require a <code>Bearer</code> token matching the <code>CRON_SECRET</code> environment variable. Unauthenticated requests return HTTP 401.</Detail>
            <Detail label="Response headers">Every response includes <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, and <code>X-RateLimit-Reset</code> headers for client-side backoff implementation.</Detail>
          </Section>

          {/* 6. Vulnerability management */}
          <div className="page-break" />
          <Section title="6. Vulnerability Management" accent="#64748b">
            <p>
              RuneSignal follows a structured approach to identifying and remediating security vulnerabilities.
            </p>
            <Detail label="Dependency scanning">GitHub Dependabot enabled on the repository. Automated PRs raised for known CVEs in <code>npm</code> dependencies. Critical and high severity issues targeted for resolution within 7 days.</Detail>
            <Detail label="OWASP ZAP">Automated OWASP ZAP baseline scan runs weekly via GitHub Actions against the production deployment. Scan reports are retained as artefacts for 90 days. Results reviewed on each run.</Detail>
            <Detail label="Bug bounty">A HackerOne-managed bug bounty programme is planned for Q2 2026. Scope: all <code>/api/v1/*</code> endpoints and the dashboard application.</Detail>
            <Detail label="Penetration test">A formal penetration test via Cobalt.io or equivalent is planned for Q3 2026, required before any enterprise deal with a regulated buyer.</Detail>
            <Detail label="Incident response">P1 security incidents are acknowledged within 15 minutes (see SLA). The Customer is notified of any Personal Data breach within 72 hours per GDPR Article 33.</Detail>
          </Section>

          {/* 7. Infrastructure */}
          <Section title="7. Infrastructure and Supply Chain" accent="#10b981">
            <p>
              RuneSignal is built on a minimal, auditable supply chain of established cloud infrastructure providers.
            </p>
            <Detail label="Hosting">Vercel (application layer). Vercel is SOC 2 Type II certified and ISO 27001 compliant.</Detail>
            <Detail label="Database">Supabase (PostgreSQL). Supabase is SOC 2 Type II certified. Data hosted on AWS.</Detail>
            <Detail label="Edge rate limiting">Upstash Redis. Upstash is SOC 2 Type II certified.</Detail>
            <Detail label="Payments">Stripe (billing only). Stripe is PCI DSS Level 1 certified. No payment card data passes through RuneSignal infrastructure.</Detail>
            <Detail label="Source code">Hosted on GitHub. Branch protection rules enforced on <code>main</code> and <code>dev</code>. All changes require pull request review.</Detail>
          </Section>

          {/* 8. Compliance posture */}
          <Section title="8. Regulatory Compliance Posture" accent="#3b82f6">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <Th>Framework</Th>
                  <Th>Status</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                <Tr><Td>GDPR</Td><Td><Badge color="#10b981">Implemented</Badge></Td><Td>DPA available. RLS, encryption, deletion rights, breach notification in place.</Td></Tr>
                <Tr><Td>EU AI Act (Articles 13, 14, 17, 26)</Td><Td><Badge color="#10b981">Core capability</Badge></Td><Td>Evidence export endpoint generates article-mapped compliance packages.</Td></Tr>
                <Tr><Td>ISO 42001</Td><Td><Badge color="#f59e0b">Partial</Badge></Td><Td>Clause 9 evidence mapping in progress. Full certification not yet pursued.</Td></Tr>
                <Tr><Td>SOC 2 Type I</Td><Td><Badge color="#f59e0b">Planned Q3 2026</Badge></Td><Td>Observation period begins Q2 2026. Required for US enterprise buyers.</Td></Tr>
                <Tr><Td>SOC 2 Type II</Td><Td><Badge color="#64748b">Roadmap</Badge></Td><Td>12-month observation required after Type I.</Td></Tr>
                <Tr><Td>ISO 27001</Td><Td><Badge color="#64748b">Roadmap</Badge></Td><Td>Post Series A priority.</Td></Tr>
                <Tr><Td>HIPAA</Td><Td><Badge color="#64748b">Roadmap</Badge></Td><Td>Available on Enterprise tier with BAA. Timeline subject to customer demand.</Td></Tr>
              </tbody>
            </table>
          </Section>

        </div>

        {/* Footer */}
        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
            Security enquiries: <a href="mailto:security@runesignal.ai" style={{ color: '#10b981' }}>security@runesignal.ai</a>
            &nbsp;·&nbsp;
            <a href="/legal/dpa" style={{ color: '#10b981' }}>Data Processing Agreement</a>
            &nbsp;·&nbsp;
            <a href="/legal/sla" style={{ color: '#10b981' }}>Service Level Agreement</a>
          </p>
          <p style={{ fontSize: '0.75rem', color: '#334155' }}>
            RuneSignal Architecture Trust Document · {LAST_UPDATED} · This document is provided for informational purposes only and does not constitute a warranty or guarantee of security. Controls are subject to change with notice.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Components ─────────────────────────────────────────────────────────── */

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontSize: '1.1rem',
        fontWeight: 600,
        color: '#f1f5f9',
        marginBottom: '1.25rem',
        paddingBottom: '0.5rem',
        borderBottom: `2px solid ${accent}`,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        {title}
      </h2>
      <div style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {children}
      </div>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.75rem', alignItems: 'start', paddingLeft: '0.5rem' }}>
      <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem', paddingTop: '0.05rem' }}>{label}</span>
      <span style={{ whiteSpace: 'pre-line' }}>{children}</span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '0.5rem 0.75rem', color: '#94a3b8', fontSize: '0.85rem', verticalAlign: 'top' }}>{children}</td>;
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{children}</tr>;
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 600,
      color,
      background: `${color}18`,
      border: `1px solid ${color}40`,
    }}>
      {children}
    </span>
  );
}

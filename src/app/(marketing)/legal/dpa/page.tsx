export const metadata = {
  title: 'Data Processing Agreement | RuneSignal',
  description: 'RuneSignal Data Processing Agreement — GDPR Article 28 compliant terms for enterprise customers.',
};

export default function DpaPage() {
  const effective = 'April 2026';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080812',
      color: '#e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    }}>
      {/* Nav bar */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <a href="/" style={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981', textDecoration: 'none' }}>
          RuneSignal
        </a>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
          <a href="/legal/dpa" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>DPA</a>
          <a href="/legal/sla" style={{ color: '#64748b', textDecoration: 'none' }}>SLA</a>
          <a href="/login" style={{ color: '#64748b', textDecoration: 'none' }}>Sign In</a>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10b981', marginBottom: '0.75rem' }}>
            Legal
          </p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2, marginBottom: '1rem' }}>
            Data Processing Agreement
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.7 }}>
            Effective: {effective} &nbsp;·&nbsp; Governs processing of personal data under GDPR Article 28 and equivalent regulations.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          <Section title="1. Parties and Definitions">
            <p>This Data Processing Agreement ("<strong>DPA</strong>") forms part of the RuneSignal Subscription Agreement between:</p>
            <ul>
              <li><strong>Controller:</strong> The entity accessing RuneSignal services (the "<strong>Customer</strong>").</li>
              <li><strong>Processor:</strong> RuneSignal Ltd ("<strong>RuneSignal</strong>"), the operator of the RuneSignal platform.</li>
            </ul>
            <p>Capitalised terms not defined herein have the meanings set out in the Subscription Agreement. "<strong>Personal Data</strong>", "<strong>Processing</strong>", "<strong>Data Subject</strong>", and "<strong>Supervisory Authority</strong>" have the meanings given by GDPR (EU 2016/679).</p>
          </Section>

          <Section title="2. Scope and Nature of Processing">
            <p>RuneSignal processes Personal Data on behalf of the Customer solely to provide the RuneSignal platform services, including:</p>
            <ul>
              <li>Storing and signing AI agent action logs (provenance ledger)</li>
              <li>Routing human-in-the-loop approval requests</li>
              <li>Generating EU AI Act compliance evidence packages</li>
              <li>Providing anomaly detection and governance intelligence</li>
            </ul>
            <p>Categories of data processed: agent identifiers, user account information (email, display name), audit event metadata, and any data fields submitted by the Customer in API payloads.</p>
            <p>Data subjects: Customer employees, Customer's end users whose actions are audited, and AI agents registered to the Customer's tenant.</p>
          </Section>

          <Section title="3. Customer Obligations (Controller)">
            <p>The Customer shall:</p>
            <ul>
              <li>Ensure it has a lawful basis for processing Personal Data before submitting it to the RuneSignal API.</li>
              <li>Provide all required notices and obtain necessary consents from data subjects.</li>
              <li>Not instruct RuneSignal to process Personal Data in a manner that would violate applicable law.</li>
              <li>Ensure that only authorised personnel access the RuneSignal dashboard and API keys.</li>
            </ul>
          </Section>

          <Section title="4. RuneSignal Obligations (Processor)">
            <p>RuneSignal shall:</p>
            <ul>
              <li>Process Personal Data only on documented instructions from the Customer, unless required to do so by EU or Member State law.</li>
              <li>Ensure that persons authorised to process Personal Data are bound by confidentiality obligations.</li>
              <li>Implement the technical and organisational measures described in Section 5.</li>
              <li>Not engage sub-processors without the Customer's prior written or electronic authorisation (see Section 7).</li>
              <li>Assist the Customer in responding to Data Subject rights requests, insofar as reasonably possible given the nature of processing.</li>
              <li>Notify the Customer without undue delay (and within 72 hours where feasible) upon becoming aware of a Personal Data breach affecting Customer data.</li>
              <li>Delete or return all Personal Data upon termination of the Subscription Agreement, at the Customer's election, within 30 days.</li>
            </ul>
          </Section>

          <Section title="5. Technical and Organisational Security Measures">
            <p>RuneSignal maintains the following measures:</p>
            <ul>
              <li><strong>Encryption at rest:</strong> All data stored in Supabase (PostgreSQL) is encrypted using AES-256.</li>
              <li><strong>Encryption in transit:</strong> All data transmitted via TLS 1.2 or higher.</li>
              <li><strong>Cryptographic signing:</strong> Every audit event is signed with Ed25519. Signatures are immutable and append-only.</li>
              <li><strong>Tenant isolation:</strong> Row-Level Security (RLS) enforced at the database layer ensures strict per-tenant data isolation.</li>
              <li><strong>Access control:</strong> Multi-Factor Authentication (TOTP, AAL2) enforced for all dashboard access. API keys are stored as SHA-256 hashes only.</li>
              <li><strong>Rate limiting:</strong> Per-tenant rate limits enforced at the edge to prevent abuse.</li>
              <li><strong>Audit logging:</strong> All administrative access and data operations are logged to the immutable audit ledger.</li>
            </ul>
          </Section>

          <Section title="6. Data Retention and Deletion">
            <p>RuneSignal retains Customer Personal Data for the duration of the active Subscription Agreement plus a 30-day grace period. Upon written request, RuneSignal will:</p>
            <ul>
              <li>Delete all Personal Data from live systems within 30 days of termination.</li>
              <li>Delete all Personal Data from backups within 90 days of termination.</li>
              <li>Provide written confirmation of deletion upon request.</li>
            </ul>
            <p>Note: Cryptographic signatures in the immutable audit ledger may reference pseudonymised event identifiers that cannot be deleted without breaking the integrity chain. These references do not contain Personal Data in identifiable form.</p>
          </Section>

          <Section title="7. Sub-Processors">
            <p>RuneSignal engages the following sub-processors to provide the platform services:</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginTop: '1rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <Th>Sub-Processor</Th>
                  <Th>Purpose</Th>
                  <Th>Location</Th>
                </tr>
              </thead>
              <tbody>
                <Tr><Td>Supabase Inc.</Td><Td>Database, authentication, storage</Td><Td>US / EU (selectable)</Td></Tr>
                <Tr><Td>Vercel Inc.</Td><Td>Application hosting and edge compute</Td><Td>US / EU (selectable)</Td></Tr>
                <Tr><Td>Upstash Inc.</Td><Td>Edge rate limiting (Redis)</Td><Td>US / EU (selectable)</Td></Tr>
                <Tr><Td>Stripe Inc.</Td><Td>Payment processing (billing data only)</Td><Td>US / EU</Td></Tr>
              </tbody>
            </table>
            <p style={{ marginTop: '1rem' }}>RuneSignal will notify the Customer of any intended addition or replacement of sub-processors with at least 10 days' notice. The Customer may object in writing within that period.</p>
          </Section>

          <Section title="8. International Data Transfers">
            <p>Where Personal Data is transferred outside the European Economic Area (EEA), RuneSignal ensures an adequate level of protection through:</p>
            <ul>
              <li>Standard Contractual Clauses (SCCs) approved by the European Commission (Decision 2021/914).</li>
              <li>Transfers only to sub-processors that maintain EU-equivalent adequacy under their own DPAs.</li>
            </ul>
            <p>Customers with EU data residency requirements should configure their tenant to use EU-region Supabase and Vercel deployments via the Data Residency settings in the RuneSignal dashboard.</p>
          </Section>

          <Section title="9. Audit Rights">
            <p>The Customer may, upon 30 days' written notice and no more than once per calendar year, request:</p>
            <ul>
              <li>A copy of RuneSignal's most recent security posture summary or third-party audit report.</li>
              <li>Written responses to a reasonable security questionnaire (up to 50 questions).</li>
            </ul>
            <p>On-site audits require mutual agreement and are subject to reasonable confidentiality obligations.</p>
          </Section>

          <Section title="10. Governing Law">
            <p>This DPA is governed by the laws of England and Wales (for EU/UK customers) or the laws of the State of Delaware, USA (for customers outside the EU/UK), unless otherwise specified in the Subscription Agreement.</p>
          </Section>

          <Section title="11. Contact">
            <p>Data protection enquiries: <a href="mailto:privacy@runesignal.ai" style={{ color: '#10b981' }}>privacy@runesignal.ai</a></p>
            <p>RuneSignal Ltd, registered in England and Wales.</p>
          </Section>

        </div>

        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
          <span>RuneSignal Data Processing Agreement · {effective}</span>
          <a href="/legal/sla" style={{ color: '#10b981', textDecoration: 'none' }}>Service Level Agreement →</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {title}
      </h2>
      <div style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {children}
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '0.5rem 0.75rem', color: '#94a3b8' }}>{children}</td>;
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{children}</tr>;
}

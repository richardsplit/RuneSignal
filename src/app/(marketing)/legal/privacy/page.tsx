export const metadata = {
  title: 'Privacy Policy | RuneSignal',
  description: 'RuneSignal Privacy Policy — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  const effective = 'April 2026';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)', textDecoration: 'none' }}>RuneSignal</a>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
          <a href="/legal/privacy" style={{ color: 'var(--success)', textDecoration: 'none', fontWeight: 600 }}>Privacy</a>
          <a href="/legal/terms" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Terms</a>
          <a href="/legal/dpa" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DPA</a>
          <a href="/login" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Sign In</a>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '4rem 2rem 6rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Effective date: {effective}</p>
        </div>

        {[
          {
            title: '1. Information We Collect',
            body: `We collect information you provide directly to us, such as when you create an account, configure agents, or contact support. This includes: account identifiers (name, email, organisation name), authentication credentials (hashed passwords, OAuth tokens), agent telemetry and audit events produced by the RuneSignal SDK, billing information processed via Stripe (we do not store raw card data), and support communications.`,
          },
          {
            title: '2. How We Use Your Information',
            body: `We use collected information to operate, maintain, and improve the RuneSignal platform; to send transactional notifications (deployment alerts, HITL approval requests, billing receipts); to enforce our Terms of Service and acceptable-use policies; to comply with legal obligations under GDPR, HIPAA, and applicable data-protection laws; and to generate aggregated, anonymised analytics about platform usage.`,
          },
          {
            title: '3. Legal Basis for Processing (GDPR)',
            body: `For users in the European Economic Area, we process personal data on the basis of: performance of a contract (providing the service you signed up for), legitimate interests (security monitoring, fraud prevention, product improvement), legal obligation (audit logs required by AI-Act Article 12), and consent where required (marketing emails).`,
          },
          {
            title: '4. Data Retention',
            body: `Account data is retained for the duration of your subscription plus 90 days after termination to allow data export. Audit ledger entries are immutable and retained for 7 years to comply with EU AI Act Article 12 obligations. Aggregated telemetry is retained indefinitely in anonymised form. You may request deletion of personal data via privacy@runesignal.com; immutable compliance records are exempt.`,
          },
          {
            title: '5. Data Sharing and Sub-Processors',
            body: `We share data only with sub-processors necessary to deliver the service: Supabase (database and authentication, hosted in the EU), Vercel (edge hosting), Stripe (payment processing), Sentry (error monitoring), and Upstash (rate-limit cache). A full sub-processor list is available on request. We do not sell personal data to third parties.`,
          },
          {
            title: '6. International Transfers',
            body: `RuneSignal is incorporated in the European Union. Data processed by US-based sub-processors is governed by EU Standard Contractual Clauses (SCCs) or the EU-US Data Privacy Framework where applicable. You may configure data-residency policies within the platform to restrict which regions process your data.`,
          },
          {
            title: '7. Your Rights',
            body: `Under GDPR and equivalent regulations you have the right to: access a copy of your personal data, correct inaccurate data, request erasure (subject to retention obligations), object to processing based on legitimate interests, restrict processing pending a dispute, and data portability. To exercise these rights, contact privacy@runesignal.com. We will respond within 30 days.`,
          },
          {
            title: '8. Security',
            body: `RuneSignal employs industry-standard security controls: TLS 1.3 in transit, AES-256 at rest, SOC 2 Type II-aligned policies, MFA enforcement, and continuous anomaly detection. Our agent audit ledger is cryptographically chained and tamper-evident. For a detailed security overview see /security.`,
          },
          {
            title: '9. Cookies',
            body: `We use strictly necessary cookies to maintain authenticated sessions and preferences. No third-party advertising cookies are set. You may disable non-essential cookies in your browser without affecting core platform functionality.`,
          },
          {
            title: '10. Changes to This Policy',
            body: `We may update this policy periodically. Material changes will be communicated by email to account owners at least 30 days before they take effect. Continued use of the platform after the effective date constitutes acceptance.`,
          },
          {
            title: '11. Contact',
            body: `Questions or concerns? Contact our Data Protection Officer at privacy@runesignal.com or write to: RuneSignal, Attn: Data Protection, European Union.`,
          },
        ].map(({ title, body }) => (
          <section key={title} style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem' }}>{title}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: '0.9375rem' }}>{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

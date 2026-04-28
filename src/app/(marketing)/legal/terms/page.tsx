export const metadata = {
  title: 'Terms of Service | RuneSignal',
  description: 'RuneSignal Terms of Service — the agreement governing your use of the platform.',
};

export default function TermsPage() {
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
          <a href="/legal/privacy" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Privacy</a>
          <a href="/legal/terms" style={{ color: 'var(--success)', textDecoration: 'none', fontWeight: 600 }}>Terms</a>
          <a href="/legal/dpa" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DPA</a>
          <a href="/login" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Sign In</a>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '4rem 2rem 6rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Terms of Service
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Effective date: {effective}</p>
        </div>

        {[
          {
            title: '1. Acceptance',
            body: `By accessing or using the RuneSignal platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you are entering into these Terms on behalf of an organisation, you represent that you have authority to bind that organisation. If you do not agree, do not use the Service.`,
          },
          {
            title: '2. Description of Service',
            body: `RuneSignal provides an enterprise AI governance platform that enables organisations to register, monitor, audit, and control AI agents in production. The Service includes the web application, REST API, SDK libraries, and associated infrastructure.`,
          },
          {
            title: '3. Account Registration and Security',
            body: `You must provide accurate registration information and keep it current. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must notify us immediately of any unauthorised access at security@runesignal.com. We recommend enabling multi-factor authentication, which the platform supports via TOTP.`,
          },
          {
            title: '4. Acceptable Use',
            body: `You agree not to: use the Service to process data in violation of applicable law; attempt to reverse-engineer, disassemble, or circumvent security controls; resell or sublicense the Service without written consent; use the Service to store or transmit malicious code; or interfere with the integrity or availability of the platform. Violation of this section may result in immediate account suspension.`,
          },
          {
            title: '5. Subscription and Billing',
            body: `Access to paid features requires a valid subscription. Fees are billed in advance on a monthly or annual basis via Stripe. All fees are non-refundable except as required by law or as expressly stated in your order. We reserve the right to suspend access for accounts with overdue balances after a 7-day grace period and written notice.`,
          },
          {
            title: '6. Intellectual Property',
            body: `RuneSignal retains all rights, title, and interest in the Service, including all software, documentation, and trade marks. You retain ownership of your data and agent configurations uploaded to the platform. You grant RuneSignal a limited licence to process your data solely to provide the Service.`,
          },
          {
            title: '7. Data Processing',
            body: `The processing of personal data uploaded to the platform is governed by our Data Processing Agreement (DPA), available at /legal/dpa. Where GDPR applies, RuneSignal acts as a data processor and you act as the data controller. You are responsible for ensuring a lawful basis for all personal data you submit.`,
          },
          {
            title: '8. Confidentiality',
            body: `Each party agrees to protect the other's confidential information with at least the same degree of care it uses for its own confidential information, and not less than reasonable care. This obligation does not apply to information that is publicly available, independently developed, or required to be disclosed by law.`,
          },
          {
            title: '9. Warranties and Disclaimers',
            body: `RuneSignal warrants that the Service will perform materially in accordance with the documentation. EXCEPT AS EXPRESSLY STATED, THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.`,
          },
          {
            title: '10. Limitation of Liability',
            body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, RUNESIGNAL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. RUNESIGNAL'S TOTAL CUMULATIVE LIABILITY SHALL NOT EXCEED THE FEES PAID IN THE 12 MONTHS PRECEDING THE CLAIM. NOTHING IN THESE TERMS LIMITS LIABILITY FOR FRAUD, GROSS NEGLIGENCE, OR DEATH/PERSONAL INJURY.`,
          },
          {
            title: '11. Term and Termination',
            body: `These Terms are effective until terminated. Either party may terminate for convenience with 30 days' written notice. Either party may terminate immediately for material breach if the breach is not cured within 14 days of notice. Upon termination, you may export your data within 30 days; thereafter we may delete it subject to statutory retention obligations.`,
          },
          {
            title: '12. Governing Law',
            body: `These Terms are governed by the laws of the European Union and the jurisdiction in which RuneSignal is incorporated. Disputes shall be resolved by binding arbitration under ICC rules, except either party may seek injunctive relief in any court of competent jurisdiction.`,
          },
          {
            title: '13. Changes to Terms',
            body: `We may update these Terms at any time. Material changes will be communicated by email at least 30 days before they take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.`,
          },
          {
            title: '14. Contact',
            body: `Legal inquiries: legal@runesignal.com. RuneSignal, European Union.`,
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

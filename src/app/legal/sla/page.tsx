export const metadata = {
  title: 'Service Level Agreement | RuneSignal',
  description: 'RuneSignal SLA — uptime commitments, response times, and support tiers for enterprise customers.',
};

export default function SlaPage() {
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
          <a href="/legal/dpa" style={{ color: '#64748b', textDecoration: 'none' }}>DPA</a>
          <a href="/legal/sla" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>SLA</a>
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
            Service Level Agreement
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.7 }}>
            Effective: {effective} &nbsp;·&nbsp; Defines uptime commitments, incident response times, and support obligations for all RuneSignal subscription tiers.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          <Section title="1. Uptime Commitment">
            <p>RuneSignal commits to the following monthly uptime targets for the API and dashboard:</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <Th>Tier</Th>
                  <Th>Monthly Uptime Target</Th>
                  <Th>Maximum Downtime / Month</Th>
                </tr>
              </thead>
              <tbody>
                <Tr><Td>Starter</Td><Td>99.5%</Td><Td>~3.6 hours</Td></Tr>
                <Tr><Td>Pro</Td><Td>99.9%</Td><Td>~43 minutes</Td></Tr>
                <Tr><Td>Enterprise</Td><Td>99.95%</Td><Td>~22 minutes</Td></Tr>
              </tbody>
            </table>

            <p><strong>Uptime</strong> is calculated as: <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>(total minutes − downtime minutes) / total minutes × 100</code></p>
            <p>Scheduled maintenance windows (announced ≥ 48 hours in advance) do not count toward downtime.</p>
          </Section>

          <Section title="2. Incident Severity and Response Times">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <Th>Priority</Th>
                  <Th>Definition</Th>
                  <Th>Acknowledgment</Th>
                  <Th>Target Resolution</Th>
                </tr>
              </thead>
              <tbody>
                <Tr>
                  <Td><span style={{ color: '#ef4444', fontWeight: 600 }}>P1 — Critical</span></Td>
                  <Td>Complete API unavailability; data integrity breach; security incident</Td>
                  <Td>15 minutes</Td>
                  <Td>4 hours</Td>
                </Tr>
                <Tr>
                  <Td><span style={{ color: '#f59e0b', fontWeight: 600 }}>P2 — High</span></Td>
                  <Td>Core API degraded (&gt; 10% error rate); dashboard inaccessible; evidence export failing</Td>
                  <Td>1 hour</Td>
                  <Td>8 hours</Td>
                </Tr>
                <Tr>
                  <Td><span style={{ color: '#3b82f6', fontWeight: 600 }}>P3 — Medium</span></Td>
                  <Td>Non-critical feature degraded; webhook delivery delayed; dashboard slowness</Td>
                  <Td>4 hours</Td>
                  <Td>2 business days</Td>
                </Tr>
                <Tr>
                  <Td><span style={{ color: '#64748b', fontWeight: 600 }}>P4 — Low</span></Td>
                  <Td>Cosmetic issues; documentation requests; general enquiries</Td>
                  <Td>1 business day</Td>
                  <Td>5 business days</Td>
                </Tr>
              </tbody>
            </table>
            <p>Acknowledgment means RuneSignal has confirmed receipt, assigned an owner, and is actively investigating. Resolution means the issue is resolved or a workaround is in place.</p>
          </Section>

          <Section title="3. Support Channels by Tier">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <Th>Channel</Th>
                  <Th>Starter</Th>
                  <Th>Pro</Th>
                  <Th>Enterprise</Th>
                </tr>
              </thead>
              <tbody>
                <Tr><Td>Email support</Td><Td>✓</Td><Td>✓</Td><Td>✓</Td></Tr>
                <Tr><Td>Priority email queue</Td><Td>—</Td><Td>✓</Td><Td>✓</Td></Tr>
                <Tr><Td>Shared Slack channel</Td><Td>—</Td><Td>—</Td><Td>✓</Td></Tr>
                <Tr><Td>Named account engineer</Td><Td>—</Td><Td>—</Td><Td>✓</Td></Tr>
                <Tr><Td>Security questionnaire support</Td><Td>—</Td><Td>—</Td><Td>✓</Td></Tr>
                <Tr><Td>Onboarding session (video)</Td><Td>—</Td><Td>1 × 30 min</Td><Td>Unlimited</Td></Tr>
              </tbody>
            </table>
            <p>Support email: <a href="mailto:support@runesignal.ai" style={{ color: '#10b981' }}>support@runesignal.ai</a> (monitored Mon–Fri, 09:00–18:00 UTC).</p>
          </Section>

          <Section title="4. Service Credits">
            <p>If RuneSignal fails to meet the monthly uptime commitment for a given calendar month, the Customer is eligible for a service credit applied to the following month's invoice:</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <Th>Actual Uptime</Th>
                  <Th>Credit (% of monthly fee)</Th>
                </tr>
              </thead>
              <tbody>
                <Tr><Td>99.0% – &lt; committed target</Td><Td>10%</Td></Tr>
                <Tr><Td>95.0% – &lt; 99.0%</Td><Td>25%</Td></Tr>
                <Tr><Td>&lt; 95.0%</Td><Td>50%</Td></Tr>
              </tbody>
            </table>
            <p>Credits must be requested within 30 days of the incident by emailing <a href="mailto:support@runesignal.ai" style={{ color: '#10b981' }}>support@runesignal.ai</a> with reference to the incident. Credits are the sole and exclusive remedy for uptime failures.</p>
          </Section>

          <Section title="5. Exclusions">
            <p>The uptime commitment does not apply to downtime caused by:</p>
            <ul>
              <li>Factors outside RuneSignal's reasonable control (force majeure, third-party network failures)</li>
              <li>Customer's own infrastructure, code, or misconfiguration</li>
              <li>Scheduled maintenance announced ≥ 48 hours in advance</li>
              <li>Free-tier or trial accounts</li>
              <li>Beta features explicitly marked as preview or experimental</li>
            </ul>
          </Section>

          <Section title="6. Monitoring and Status">
            <p>RuneSignal maintains a public status page at <a href="https://status.runesignal.ai" style={{ color: '#10b981' }}>status.runesignal.ai</a> with real-time uptime data, incident history, and scheduled maintenance announcements.</p>
            <p>Customers may subscribe to status notifications via email or webhook from the status page.</p>
          </Section>

          <Section title="7. Changes to this SLA">
            <p>RuneSignal may update this SLA with 30 days' prior written notice. If a change materially reduces the service commitment, the Customer may terminate the Subscription Agreement with a pro-rata refund for the remaining pre-paid period.</p>
          </Section>

          <Section title="8. Contact">
            <p>SLA and support enquiries: <a href="mailto:support@runesignal.ai" style={{ color: '#10b981' }}>support@runesignal.ai</a></p>
            <p>Security incidents: <a href="mailto:security@runesignal.ai" style={{ color: '#10b981' }}>security@runesignal.ai</a></p>
          </Section>

        </div>

        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
          <span>RuneSignal Service Level Agreement · {effective}</span>
          <a href="/legal/dpa" style={{ color: '#10b981', textDecoration: 'none' }}>← Data Processing Agreement</a>
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
  return <td style={{ padding: '0.5rem 0.75rem', color: '#94a3b8', verticalAlign: 'top' }}>{children}</td>;
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{children}</tr>;
}

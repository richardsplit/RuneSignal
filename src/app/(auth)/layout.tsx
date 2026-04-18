/**
 * Authentication shell (login / onboarding / mfa-verify).
 *
 * Deliberately chrome-free. Each auth page owns its centered card UI.
 * A polished auth shell ships in the design-system commit.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="auth-layout">{children}</div>;
}

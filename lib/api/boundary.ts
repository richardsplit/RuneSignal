/**
 * RuneSignal API Boundary Definition
 *
 * Defines which routes are accessible via API key (public product surface)
 * versus which require a dashboard session (internal operations).
 *
 * Used by middleware.ts and SDK documentation generation.
 */

/**
 * PUBLIC API — accessible via Bearer tl_* API key.
 * These are the routes that form the RuneSignal product API.
 */
export const PUBLIC_API_ROUTES: string[] = [
  // Firewall (core wedge — unified action evaluation)
  '/api/v1/firewall/evaluate',
  '/api/v1/firewall/evaluations',

  // Agent Identity (S6)
  '/api/v1/agents/register',
  '/api/v1/agents',

  // HITL Exceptions (S7)
  '/api/v1/exceptions',

  // Provenance (S3)
  '/api/v1/provenance/certify',
  '/api/v1/provenance/verify',
  '/api/v1/provenance',

  // Policy / Conflict Arbiter (S1)
  '/api/v1/intent',

  // Moral Evaluation (S8)
  '/api/v1/moral',

  // Enforcement (S6 + S8 combined)
  '/api/v1/enforce/tool-call',

  // Public key (no auth required)
  '/api/v1/verify/pubkey',
];

/**
 * INTERNAL API — requires Supabase dashboard session.
 * Not accessible via API key. Platform operations only.
 */
export const INTERNAL_API_ROUTES: string[] = [
  '/api/v1/billing',
  '/api/v1/compliance',
  '/api/v1/metrics',
  '/api/v1/integrations',
  '/api/v1/keys',
  '/api/v1/policies',
  '/api/v1/sovereign',
  '/api/v1/nhi',
  '/api/v1/finops',
  '/api/v1/anomaly',
  '/api/v1/a2a',
  '/api/v1/physical',
  '/api/v1/redteam',
  '/api/v1/explain',
  '/api/v1/siem',
];

/**
 * Returns true if a route is publicly accessible via API key.
 */
export function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Returns true if a route requires a dashboard session.
 */
export function isInternalApiRoute(pathname: string): boolean {
  return INTERNAL_API_ROUTES.some(route => pathname.startsWith(route));
}

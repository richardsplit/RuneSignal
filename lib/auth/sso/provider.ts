/**
 * TrustLayer SSO Provider — Abstract Interface
 *
 * All SSO providers implement this interface.
 * The concrete implementations (okta.ts, entra.ts, auth0.ts) handle
 * provider-specific OIDC/SAML flows.
 */

export interface SSOProviderConfig {
  client_id: string;
  client_secret: string;
  issuer: string;          // e.g. https://your-domain.okta.com/oauth2/default
  redirect_uri: string;    // Always: {NEXT_PUBLIC_APP_URL}/api/v1/auth/sso/{provider}/callback
  scopes?: string[];       // Defaults to ['openid', 'profile', 'email']
}

export interface SSOUserClaims {
  sub: string;             // Provider-specific user ID
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  groups?: string[];       // Group memberships for RBAC mapping
}

export interface SSOProvider {
  readonly providerName: string;

  /**
   * Returns the URL to redirect the user to for authentication.
   */
  getAuthorizationUrl(state: string): string;

  /**
   * Exchanges the authorization code for tokens and returns user claims.
   */
  handleCallback(code: string): Promise<SSOUserClaims>;

  /**
   * Returns SAML metadata XML (only for SAML providers).
   */
  getMetadata?(): string;
}

/**
 * Builds the redirect URI for a given provider.
 */
export function buildRedirectUri(provider: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl}/api/v1/auth/sso/${provider}/callback`;
}

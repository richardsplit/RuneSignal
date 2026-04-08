/**
 * TrustLayer SSO — Microsoft Entra ID (Azure AD) OIDC Provider
 */

import { SSOProvider, SSOProviderConfig, SSOUserClaims } from './provider';

export class EntraSSOProvider implements SSOProvider {
  readonly providerName = 'entra';

  constructor(
    private readonly config: SSOProviderConfig,
    private readonly azureTenantId: string
  ) {}

  getAuthorizationUrl(state: string): string {
    const scopes = (this.config.scopes || ['openid', 'profile', 'email']).join(' ');
    const params = new URLSearchParams({
      client_id: this.config.client_id,
      response_type: 'code',
      scope: scopes,
      redirect_uri: this.config.redirect_uri,
      state,
      response_mode: 'query',
    });
    return `https://login.microsoftonline.com/${this.azureTenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<SSOUserClaims> {
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${this.azureTenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.client_id,
          client_secret: this.config.client_secret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirect_uri,
          scope: 'openid profile email',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const err = await tokenResponse.json();
      throw new Error(`Entra token exchange failed: ${err.error_description || err.error}`);
    }

    const tokens = await tokenResponse.json();

    // Fetch user from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Microsoft Graph userinfo fetch failed');
    }

    const user = await userResponse.json();
    return {
      sub: user.id,
      email: user.mail || user.userPrincipalName,
      name: user.displayName,
      given_name: user.givenName,
      family_name: user.surname,
    };
  }
}

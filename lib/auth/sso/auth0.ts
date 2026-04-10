/**
 * RuneSignal SSO — Auth0 OIDC Provider
 */

import { SSOProvider, SSOProviderConfig, SSOUserClaims } from './provider';

export class Auth0SSOProvider implements SSOProvider {
  readonly providerName = 'auth0';

  constructor(private readonly config: SSOProviderConfig) {}

  getAuthorizationUrl(state: string): string {
    const scopes = (this.config.scopes || ['openid', 'profile', 'email']).join(' ');
    const params = new URLSearchParams({
      client_id: this.config.client_id,
      response_type: 'code',
      scope: scopes,
      redirect_uri: this.config.redirect_uri,
      state,
    });
    return `${this.config.issuer}/authorize?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<SSOUserClaims> {
    const tokenResponse = await fetch(`${this.config.issuer}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.config.client_id,
        client_secret: this.config.client_secret,
        code,
        redirect_uri: this.config.redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.json();
      throw new Error(`Auth0 token exchange failed: ${err.error_description || err.error}`);
    }

    const tokens = await tokenResponse.json();

    const userResponse = await fetch(`${this.config.issuer}/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Auth0 userinfo fetch failed');
    }

    const user = await userResponse.json();
    return {
      sub: user.sub,
      email: user.email,
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
    };
  }
}

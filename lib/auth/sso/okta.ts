/**
 * RuneSignal SSO — Okta OIDC Provider
 */

import { SSOProvider, SSOProviderConfig, SSOUserClaims } from './provider';

export class OktaSSOProvider implements SSOProvider {
  readonly providerName = 'okta';

  constructor(private readonly config: SSOProviderConfig) {}

  getAuthorizationUrl(state: string): string {
    const scopes = (this.config.scopes || ['openid', 'profile', 'email']).join(' ');
    const params = new URLSearchParams({
      client_id: this.config.client_id,
      response_type: 'code',
      scope: scopes,
      redirect_uri: this.config.redirect_uri,
      state,
      nonce: crypto.randomUUID(),
    });
    return `${this.config.issuer}/v1/authorize?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<SSOUserClaims> {
    // Exchange code for tokens
    const tokenResponse = await fetch(`${this.config.issuer}/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.config.client_id}:${this.config.client_secret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.json();
      throw new Error(`Okta token exchange failed: ${err.error_description || err.error}`);
    }

    const tokens = await tokenResponse.json();

    // Fetch user info
    const userResponse = await fetch(`${this.config.issuer}/v1/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Okta userinfo fetch failed');
    }

    const user = await userResponse.json();
    return {
      sub: user.sub,
      email: user.email,
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
      groups: user.groups,
    };
  }
}

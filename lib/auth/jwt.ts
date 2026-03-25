import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

// Ensure we have a valid format secret
const secret = new TextEncoder().encode(JWT_SECRET || 'fallback_secret_for_dev_mode_only_change_in_prod');

export interface DecodedTenantPayload {
  tenant_id: string;
  role: 'admin' | 'tenant';
  [key: string]: any;
}

export interface DecodedAgentPayload {
  agent_id: string;
  tenant_id: string;
  role: 'agent';
  scopes: string[];
  [key: string]: any;
}

export class JwtHandler {
  /**
   * Validates a JWT and returns its decoded payload
   */
  static async verifyToken(token: string): Promise<DecodedTenantPayload | DecodedAgentPayload> {
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload as any; // Type assertions handled where used
    } catch (error) {
      throw new Error('Invalid JWT Token');
    }
  }

  /**
   * Generates a token for a Tenant (HS256)
   */
  static async generateTenantToken(tenantId: string, role: 'admin' | 'tenant' = 'tenant', expiresIn = '24h'): Promise<string> {
    return new SignJWT({ tenant_id: tenantId, role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  }

  /**
   * Generates a token for an Agent (HS256 for now, RS256 requires key management)
   */
  static async generateAgentToken(agentId: string, tenantId: string, scopes: string[], expiresIn = '1h'): Promise<string> {
    return new SignJWT({ agent_id: agentId, tenant_id: tenantId, role: 'agent', scopes })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  }
}

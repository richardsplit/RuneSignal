/**
 * TrustLayer Node SDK — Provenance Resource
 */

import { BaseClient } from './client';
import { CertifyRequest, ProvenanceCertificate } from './types';

export class ProvenanceResource {
  constructor(private readonly client: BaseClient) {}

  /**
   * Certifies an LLM call — hashes input/output and writes to the immutable audit ledger.
   */
  async certify(request: CertifyRequest, agentId?: string): Promise<ProvenanceCertificate> {
    const raw: any = await (this.client as any).request('POST', '/api/v1/provenance/certify', {
      body: {
        provider: request.provider,
        model: request.model,
        prompt: request.prompt,
        completion: request.completion,
        metadata: request.metadata,
      },
      agentId,
    });
    return mapCertificate(raw);
  }

  /**
   * Retrieves a provenance certificate by ID.
   */
  async get(certificateId: string): Promise<ProvenanceCertificate> {
    const raw: any = await (this.client as any).request('GET', `/api/v1/provenance/${certificateId}`);
    return mapCertificate(raw);
  }

  /**
   * Verifies the integrity of a provenance certificate.
   * Returns true if the signature is valid and data has not been tampered with.
   */
  async verify(certificateId: string): Promise<{ valid: boolean; reason?: string }> {
    return (this.client as any).request('GET', `/api/v1/provenance/verify/${certificateId}`);
  }
}

function mapCertificate(raw: any): ProvenanceCertificate {
  return {
    id: raw.id,
    tenantId: raw.tenant_id,
    agentId: raw.agent_id,
    provider: raw.provider,
    model: raw.model,
    inputHash: raw.input_hash,
    outputHash: raw.output_hash,
    signature: raw.signature,
    createdAt: raw.created_at,
  };
}

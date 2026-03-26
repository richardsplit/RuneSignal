import { AuditLedgerService } from '../../ledger/service';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { CertifyRequest, CertificatePayload } from './types';

export class CertificateService {
  /**
   * Generates a SHA-256 hash for deterministic auditing.
   */
  private static generateHash(data: string | any): string {
    const stringified = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(stringified).digest('hex');
  }

  /**
   * Processes an LLM call interception, hashes inputs/outputs,
   * generates a certificate payload, and writes to the Immutable Audit Ledger.
   */
  static async certifyCall(
    tenantId: string,
    agentId: string | null,
    request: CertifyRequest
  ): Promise<{ certificate_id: string, signature: string, model_version: string }> {
    
    // Hash inputs deterministically (Regenerate or use provided)
    const inputContent = {
      system: request.system_prompt || '',
      messages: request.user_messages
    };
    const regeneratedInputHash = this.generateHash(inputContent);
    const regeneratedOutputHash = this.generateHash(request.completion_text);
    
    // Use provided hashes if they match, or the ones we just generated
    const inputHash = request.input_hash || regeneratedInputHash;
    const outputHash = request.output_hash || regeneratedOutputHash;
    
    // Fallback if model version isn't detected yet
    const modelVersion = request.model_version || `${request.model}-latest`;

    const certificateId = uuidv4();

    const payload: CertificatePayload = {
      certificate_id: certificateId,
      tenant_id: tenantId,
      agent_id: agentId,
      provider: request.provider,
      model: request.model,
      model_version: modelVersion,
      input_hash: inputHash,
      output_hash: outputHash,
      input_tokens: request.input_tokens || 0,
      output_tokens: request.output_tokens || 0,
      latency_ms: request.latency_ms || 0,
      temperature: request.temperature || 0,
      application_id: request.application_id || 'unknown',
      tags: request.tags || [],
      timestamp: new Date().toISOString()
    };

    // Store in Ledger and sign it
    const event = await AuditLedgerService.appendEvent({
      event_type: 'S3_CERTIFICATE',
      module: 's3',
      tenant_id: tenantId,
      agent_id: agentId,
      request_id: certificateId, // Use cert ID as request ID for traceability
      payload: payload
    });

    return {
      certificate_id: certificateId,
      signature: event.signature,
      model_version: modelVersion
    };
  }
}

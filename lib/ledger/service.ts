import { createAdminClient } from '../db/supabase';
import { getLedgerSigner } from './signer';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEventInput {
  event_type: string;
  module: 's3' | 's1' | 's6' | 's7' | 's5' | 's8';
  tenant_id: string;
  agent_id?: string | null;
  request_id: string;
  payload: Record<string, any>;
}

export class AuditLedgerService {
  /**
   * Appends a new event to the immutable audit ledger.
   * Cryptographically signs the event to guarantee provenance and tamper-evidence.
   */
  static async appendEvent(input: AuditEventInput) {
    const supabase = createAdminClient();
    const signer = getLedgerSigner();

    const id = uuidv4();
    const created_at = new Date().toISOString();

    // Canonical representation for signature: (id || event_type || payload (sorted) || ts)
    const payloadString = JSON.stringify(input.payload, Object.keys(input.payload).sort());
    const dataToSign = `${id}|${input.event_type}|${payloadString}|${created_at}`;
    const signature = signer.sign(Buffer.from(dataToSign, 'utf-8'));

    const { data, error } = await supabase
      .from('audit_events')
      .insert({
        id,
        event_type: input.event_type,
        module: input.module,
        tenant_id: input.tenant_id,
        agent_id: input.agent_id || null,
        request_id: input.request_id,
        payload: input.payload,
        signature,
        created_at
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to append to audit ledger:', error);
      throw new Error('Audit Ledger violation: Failed to append event.');
    }

    return data;
  }
}

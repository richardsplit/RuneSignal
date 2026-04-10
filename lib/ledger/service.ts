import { createAdminClient } from '../db/supabase';
import { getLedgerSigner } from './signer';
import { v4 as uuidv4 } from 'uuid';
import { SIEMExporter } from '../integrations/siem/exporter';
import { PluginExecutor } from '../plugins/executor';
import { PQC_ENABLED, pqcSign } from './pqc-signer';

export interface AuditEventInput {
  event_type: string;
  module: 's1' | 's3' | 's5' | 's6' | 's7' | 's8' | 's9' | 's10' | 's11' | 's12' | 's13' | 's14' | 's15' | 's16' | 's17' | 'system';
  tenant_id: string;
  agent_id?: string | null;
  request_id?: string;
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
        request_id: input.request_id || uuidv4(),
        payload: input.payload,
        signature,
        pqc_signature: PQC_ENABLED ? pqcSign(dataToSign) : null,
        created_at
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to append to audit ledger:', error);
      throw new Error('Audit Ledger violation: Failed to append event.');
    }

    // Non-blocking SIEM push — fire-and-forget, never blocks the ledger write
    SIEMExporter.exportEvents(input.tenant_id, {
      since: new Date(Date.now() - 10 * 1000).toISOString(), // last 10s window
      limit: 50,
    }).catch(err => {
      console.warn('[SIEM] Non-blocking push failed:', err?.message);
    });

    // Non-blocking plugin dispatch — fire-and-forget, never blocks the ledger write
    if (data) {
      PluginExecutor.dispatch({
        id: data.id,
        event_type: data.event_type,
        tenant_id: data.tenant_id,
        agent_id: data.agent_id,
        payload: data.payload,
        created_at: data.created_at,
      }).catch(err => {
        console.warn('[Plugins] Non-blocking dispatch failed:', err?.message);
      });
    }

    return data;
  }
}

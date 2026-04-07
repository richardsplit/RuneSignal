import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';
import crypto from 'crypto';
import { ArbiterService } from '../s1-conflict/service';
import { ConscienceEngine } from '../s8-moralos/conscience';

export class A2AGatewayService {
    
    /**
     * Initializes an escrowed multi-agent contract
     */
    static async initiateHandshake(tenantId: string, initiatorId: string, responderId: string, payload: any) {
        const termsHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
        
        const supabase = createAdminClient();
        const { data: handshake, error } = await supabase.from('a2a_handshakes').insert({
             tenant_id: tenantId,
             initiator_id: initiatorId,
             responder_id: responderId,
             terms_hash: termsHash,
             terms_payload: payload,
             status: 'pending'
        }).select().single();

        if (error) throw new Error(`Failed to initialize A2A handshake: ${error.message}`);
        
        await AuditLedgerService.appendEvent({
            event_type: 'a2a.handshake.initiated',
            module: 's16',
            tenant_id: tenantId,
            agent_id: initiatorId,
            payload: { handshake_id: handshake.id, responder_id: responderId, terms_hash: termsHash }
        });

        return handshake;
    }

    /**
     * Accepts a cryptographic signature from one of the agents.
     * Evaluates if dual-authorization is complete and finalizes the ledger lock.
     */
    static async signHandshake(tenantId: string, handshakeId: string, agentId: string, signature: string) {
        const supabase = createAdminClient();
        
        const { error: sigError } = await supabase.from('a2a_signatures').insert({
             handshake_id: handshakeId,
             agent_id: agentId,
             signature_payload: signature
        });

        if (sigError && sigError.code === '23505') {
            return { error: 'Agent has already signed this handshake.' };
        } else if (sigError) {
            throw sigError;
        }

        const { data: handshake } = await supabase.from('a2a_handshakes').select('*').eq('id', handshakeId).eq('tenant_id', tenantId).single();
        if (!handshake) throw new Error('Handshake not found');

        const { data: sigs } = await supabase.from('a2a_signatures').select('agent_id').eq('handshake_id', handshakeId);
        
        const hasInitiator = sigs?.some(s => s.agent_id === handshake.initiator_id);
        const hasResponder = sigs?.some(s => s.agent_id === handshake.responder_id);

        if (hasInitiator && hasResponder) {
            // 1. S1 Conflict check — does this task conflict with any active intent?
            const arbiterResult = await ArbiterService.mediateIntent(
              tenantId,
              handshake.initiator_id,
              {
                intent_description: `A2A Task: ${JSON.stringify(handshake.terms_payload).slice(0, 200)}`,
                metadata: { handshake_id: handshakeId, a2a: true }
              }
            );

            if (arbiterResult.decision === 'block') {
              await supabase.from('a2a_handshakes')
                .update({ status: 'governance_blocked', updated_at: new Date().toISOString() })
                .eq('id', handshakeId);

              await AuditLedgerService.appendEvent({
                event_type: 'a2a.handshake.blocked_by_s1',
                module: 's16',
                tenant_id: tenantId,
                agent_id: handshake.initiator_id,
                payload: { handshake_id: handshakeId, reason: arbiterResult.reason }
              });
              return { status: 'blocked', reason: `S1 Arbiter: ${arbiterResult.reason}` };
            }

            // 2. S8 SOUL check — does this task violate the Corporate SOUL?
            let soulVerdict: any = { verdict: 'clear' };
            try {
              soulVerdict = await ConscienceEngine.evaluate(tenantId, {
                agent_id: handshake.initiator_id,
                action_description: `A2A task delegation: ${JSON.stringify(handshake.terms_payload).slice(0, 200)}`,
                domain: 'ops',
                action_metadata: { handshake_id: handshakeId, responder: handshake.responder_id }
              });
            } catch {
              // No SOUL configured — proceed (evaluate() already returns 'clear' when no SOUL exists)
            }

            if (soulVerdict.verdict === 'block') {
              await supabase.from('a2a_handshakes')
                .update({ status: 'governance_blocked', updated_at: new Date().toISOString() })
                .eq('id', handshakeId);
              return { status: 'blocked', reason: `S8 SOUL: ${soulVerdict.conflict_reason}` };
            }

            // All governance checks passed — finalise the handshake
            await supabase.from('a2a_handshakes')
              .update({ status: 'accepted', updated_at: new Date().toISOString() })
              .eq('id', handshakeId);
            
            await AuditLedgerService.appendEvent({
                event_type: 'a2a.handshake.accepted',
                module: 's16',
                tenant_id: tenantId,
                agent_id: handshake.initiator_id,
                payload: {
                    handshake_id: handshakeId,
                    initiator: handshake.initiator_id,
                    responder: handshake.responder_id,
                    terms_hash: handshake.terms_hash
                }
            });
            return { status: 'accepted', handshake_id: handshakeId };
        }

        return { status: 'pending_signatures', received_from: sigs?.map(s => s.agent_id) };
    }

    static async listHandshakes(tenantId: string) {
        const supabase = createAdminClient();
        const { data } = await supabase.from('a2a_handshakes').select(`
             *,
             a2a_signatures(agent_id, created_at)
        `).eq('tenant_id', tenantId).order('created_at', { ascending: false });
        return data || [];
    }
}

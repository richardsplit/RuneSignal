import { createAdminClient } from '../../db/supabase';
import { CertificateService } from '../s3-provenance/certificate';
import { AuditLedgerService } from '../../ledger/service';
import { v4 as uuidv4 } from 'uuid';

export class NHIService {

  /**
   * Fetches all API keys for a tenant, calculating their time-to-live.
   */
  static async listAgentKeys(tenantId: string) {
    const supabase = createAdminClient();
    
    // api_keys might not have an agent_id formally linked depending on phase,
    // assuming we fetch all tenant API keys as identity representations.
    const { data: keys } = await supabase.from('api_keys')
      .select('id, key_prefix, agent_id, is_active, expires_at, created_at, death_certificate_id, rotation_frequency_days')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
      
    // Calculate TTLs
    return (keys || []).map(key => {
        let ttl_days = 0;
        if (key.expires_at) {
           const diffMs = new Date(key.expires_at).getTime() - Date.now();
           ttl_days = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
        }
        return {
            ...key,
            ttl_days: ttl_days,
            status: !key.is_active ? 'revoked' : (ttl_days > 0 ? 'active' : 'expired')
        };
    });
  }

  /**
   * Instantly kills the API key, mints a death certificate to the ledger.
   */
  static async revokeIdentity(tenantId: string, keyId: string, reason: string) {
      const supabase = createAdminClient();
      
      const { data: keyData } = await supabase.from('api_keys')
        .select('*').eq('id', keyId).eq('tenant_id', tenantId).single();
        
      if (!keyData) throw new Error('Key not found');
      if (!keyData.is_active) return { success: true, message: 'Already revoked', certificateId: keyData.death_certificate_id };

      // 1. Mint Death Certificate in S3 Provenance
      const agentId = keyData.agent_id || 'unknown_agent';
      
      const deathCert = await CertificateService.certifyCall(tenantId, agentId, {
          provider: 'system',
          model: 'nhi-revocation',
          user_messages: [{ role: 'system', content: `REVOKE IDENTITY: ${keyData.key_prefix}***` }],
          completion_text: `Reason: ${reason}. Identity permanently neutralized.`,
          tags: ['s12', 'nhi', 'revocation', 'death-certificate']
      });

      // 2. Append to Audit Ledger
      await AuditLedgerService.appendEvent({
          event_type: 'agent.identity.revoked',
          module: 's12',
          tenant_id: tenantId,
          agent_id: agentId,
          request_id: deathCert.certificate_id,
          payload: { key_prefix: keyData.key_prefix, reason: reason }
      });

      // 3. Update DB state
      await supabase.from('api_keys').update({
          is_active: false,
          death_certificate_id: deathCert.certificate_id
      }).eq('id', keyId);

      return { success: true, certificate_id: deathCert.certificate_id };
  }

  /**
   * Rotates an identity. Creates a new key, marks old for asynchronous revocation (overlap).
   */
  static async rotateIdentity(tenantId: string, oldKeyId: string) {
      const supabase = createAdminClient();
      
      const { data: keyData } = await supabase.from('api_keys')
        .select('*').eq('id', oldKeyId).eq('tenant_id', tenantId).single();
        
      if (!keyData || !keyData.is_active) throw new Error('Valid active key required for rotation.');

      // 1. Generate new Key (Mock logic, real implementation depends on your Phase 1 ApiKey generator)
      const rawApiStr = `tl_${uuidv4().replace(/-/g, '')}`;
      const msgUint8 = new TextEncoder().encode(rawApiStr);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const offsetDays = keyData.rotation_frequency_days || 30;
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + offsetDays);

      const { data: newKey } = await supabase.from('api_keys').insert({
          tenant_id: tenantId,
          agent_id: keyData.agent_id,
          key_hash: hashHex,
          key_prefix: rawApiStr.substring(0, 10),
          is_active: true,
          rotation_frequency_days: offsetDays,
          expires_at: newExpiresAt.toISOString()
      }).select().single();

      // 2. Log Lineage
      await supabase.from('nhi_key_rotations').insert({
          tenant_id: tenantId,
          agent_id: keyData.agent_id,
          old_key_id: keyData.id,
          new_key_id: newKey.id,
          reason: 'Manual Rotation / Expiration'
      });

      // In a real system, the old key would be given a 24h grace period.
      // For this phase, we let it naturally expire or be explicitely revoked by cron.
      const overlapExpiry = new Date();
      overlapExpiry.setHours(overlapExpiry.getHours() + 24);
      
      await supabase.from('api_keys').update({ 
          expires_at: overlapExpiry.toISOString() 
      }).eq('id', oldKeyId);

      return { success: true, new_api_key_plain: rawApiStr, new_key: newKey };
  }
}

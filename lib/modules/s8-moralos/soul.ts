import { createAdminClient } from '../../db/supabase';
import { getLedgerSigner } from '../../ledger/signer';
import { AuditLedgerService } from '../../ledger/service';
import { CorporateSoul, MoralProfile } from './types';
import { v4 as uuidv4 } from 'uuid';

export class SoulService {
  /**
   * Creates or updates the Corporate SOUL for a tenant.
   * Deactivates previous version, signs new one with Ed25519.
   */
  static async upsertSoul(tenantId: string, soul: CorporateSoul, adminId: string): Promise<{ version: number; signature: string }> {
    const supabase = createAdminClient();
    const signer = getLedgerSigner();

    // Get current max version
    const { data: existing } = await supabase
      .from('moral_profiles')
      .select('version')
      .eq('tenant_id', tenantId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersion = existing ? existing.version + 1 : 1;

    // Deactivate current active soul
    await supabase
      .from('moral_profiles')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    // Sign the soul JSON
    const soulString = JSON.stringify(soul);
    const signature = signer.sign(Buffer.from(soulString, 'utf-8'));

    // Insert new active soul
    const { error } = await supabase
      .from('moral_profiles')
      .insert({
        tenant_id: tenantId,
        version: newVersion,
        soul_json: soul,
        signature,
        signed_by: adminId,
        is_active: true
      });

    if (error) throw new Error(`Failed to upsert SOUL: ${error.message}`);

    // Audit event
    await AuditLedgerService.appendEvent({
      event_type: 'moral.soul_updated',
      module: 's8',
      tenant_id: tenantId,
      agent_id: null,
      request_id: uuidv4(),
      payload: { version: newVersion, signed_by: adminId }
    });

    return { version: newVersion, signature };
  }

  /**
   * Retrieves the active Corporate SOUL for a tenant.
   * Verifies Ed25519 signature integrity.
   */
  static async getActiveSoul(tenantId: string): Promise<{ soul: CorporateSoul; version: number; profile: MoralProfile }> {
    const supabase = createAdminClient();
    const signer = getLedgerSigner();

    const { data, error } = await supabase
      .from('moral_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new Error('No active Corporate SOUL found for this tenant');

    // Verify signature
    const soulString = JSON.stringify(data.soul_json);
    const isValid = signer.verify(Buffer.from(soulString, 'utf-8'), data.signature);
    if (!isValid) throw new Error('SOUL signature verification failed — possible tampering detected');

    return { soul: data.soul_json as CorporateSoul, version: data.version, profile: data as MoralProfile };
  }

  /**
   * Returns all SOUL versions for a tenant, newest first.
   */
  static async getSoulHistory(tenantId: string): Promise<MoralProfile[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('moral_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('version', { ascending: false });

    if (error) throw new Error(`Failed to fetch SOUL history: ${error.message}`);
    return data as MoralProfile[];
  }

  /**
   * Verifies the Ed25519 signature of a specific SOUL version.
   */
  static async verifySoulVersion(tenantId: string, version: number): Promise<{ valid: boolean; tampered: boolean }> {
    const supabase = createAdminClient();
    const signer = getLedgerSigner();

    const { data, error } = await supabase
      .from('moral_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('version', version)
      .single();

    if (error || !data) throw new Error(`SOUL version ${version} not found`);

    const soulString = JSON.stringify(data.soul_json);
    const valid = signer.verify(Buffer.from(soulString, 'utf-8'), data.signature);

    return { valid, tampered: !valid };
  }
}

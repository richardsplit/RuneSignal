import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';
import { v4 as uuidv4 } from 'uuid';

export interface ResidencyValidationResult {
  allowed: boolean;
  provider: string;
  model: string;
  region: string;
  country: string;
  violation_reason?: string;
  alternative_provider?: { provider: string; model: string; region: string };
}

export class DataResidencyValidator {
  /**
   * Validates a planned LLM call against the tenant's residency policy.
   * Call this BEFORE every LLM API request for data classified above PUBLIC.
   *
   * @param tenantId    - The tenant making the call
   * @param provider    - LLM provider (e.g. 'openai', 'anthropic')
   * @param model       - Model name (e.g. 'gpt-4o', 'claude-sonnet-4-6')
   * @param dataClass   - Data classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PHI' | 'PII'
   * @param agentId     - Agent making the call (for audit trail)
   */
  static async validateCall(
    tenantId: string,
    provider: string,
    model: string,
    dataClass: string = 'INTERNAL',
    agentId?: string
  ): Promise<ResidencyValidationResult> {
    const supabase = createAdminClient();

    // PUBLIC data has no residency restrictions
    if (dataClass === 'PUBLIC') {
      return { allowed: true, provider, model, region: 'ANY', country: 'ANY' };
    }

    // Fetch tenant policy (allow all regions if no policy configured)
    const { data: policy } = await supabase
      .from('data_residency_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    // No policy = no restriction
    if (!policy) {
      return { allowed: true, provider, model, region: 'ANY', country: 'ANY' };
    }

    // Fetch provider's region info
    const { data: providerInfo } = await supabase
      .from('provider_regions')
      .select('*')
      .eq('provider', provider)
      .eq('model', model)
      .single();

    if (!providerInfo) {
      // Unknown provider — treat as potential violation
      const message = `Provider '${provider}' with model '${model}' is not in the known provider registry. Cannot validate data residency.`;
      if (policy.block_on_violation) {
        await this.logViolation(tenantId, agentId, provider, model, message);
        return { allowed: false, provider, model, region: 'UNKNOWN', country: 'UNKNOWN', violation_reason: message };
      }
      return { allowed: true, provider, model, region: 'UNKNOWN', country: 'UNKNOWN', violation_reason: `WARNING: ${message}` };
    }

    // Check region allowlist
    const regionAllowed = policy.allowed_regions.includes(providerInfo.region);
    // Check country blocklist
    const countryBlocked = policy.blocked_countries?.includes(providerInfo.country);

    // PHI/PII data requires HIPAA or GDPR compliance
    const needsHipaa = ['PHI'].includes(dataClass) && !providerInfo.hipaa_eligible;
    const needsGdpr = ['PII', 'CONFIDENTIAL'].includes(dataClass) && 
                      policy.allowed_regions.some((r: string) => ['EU', 'EEA', 'UK'].includes(r)) &&
                      !providerInfo.gdpr_compliant;

    const isViolation = !regionAllowed || countryBlocked || needsHipaa || needsGdpr;

    if (isViolation) {
      const reasons = [];
      if (!regionAllowed) reasons.push(`Region '${providerInfo.region}' not in allowed regions [${policy.allowed_regions.join(', ')}]`);
      if (countryBlocked) reasons.push(`Country '${providerInfo.country}' is explicitly blocked`);
      if (needsHipaa) reasons.push(`${dataClass} data requires HIPAA-eligible provider`);
      if (needsGdpr) reasons.push(`${dataClass} data in EU/EEA/UK context requires GDPR-compliant provider`);

      const violationReason = reasons.join('; ');

      // Try to find a compliant alternative if auto-reroute is enabled
      let alternative: { provider: string; model: string; region: string } | undefined;
      if (policy.auto_reroute) {
        const { data: alternatives } = await supabase
          .from('provider_regions')
          .select('provider, model, region')
          .in('region', policy.allowed_regions)
          .eq('gdpr_compliant', needsGdpr ? true : undefined as any)
          .eq('hipaa_eligible', needsHipaa ? true : undefined as any)
          .limit(1);
        
        if (alternatives && alternatives.length > 0) {
          alternative = alternatives[0];
        }
      }

      await this.logViolation(tenantId, agentId, provider, model, violationReason);

      if (policy.block_on_violation) {
        return {
          allowed: false, provider, model,
          region: providerInfo.region, country: providerInfo.country,
          violation_reason: violationReason,
          alternative_provider: alternative
        };
      }

      // Warn but allow (block_on_violation = false)
      return {
        allowed: true, provider, model,
        region: providerInfo.region, country: providerInfo.country,
        violation_reason: `WARNING (not blocked): ${violationReason}`,
        alternative_provider: alternative
      };
    }

    return { allowed: true, provider, model, region: providerInfo.region, country: providerInfo.country };
  }

  private static async logViolation(
    tenantId: string, agentId: string | undefined,
    provider: string, model: string, reason: string
  ): Promise<void> {
    await AuditLedgerService.appendEvent({
      event_type: 'sovereignty.residency_violation',
      module: 's10',
      tenant_id: tenantId,
      agent_id: agentId || null,
      request_id: uuidv4(),
      payload: { provider, model, violation_reason: reason }
    });
  }

  /**
   * Returns all providers compliant with the tenant's current policy.
   */
  static async getCompliantProviders(tenantId: string, dataClass: string = 'INTERNAL') {
    const supabase = createAdminClient();
    const { data: policy } = await supabase
      .from('data_residency_policies').select('*').eq('tenant_id', tenantId).single();

    if (!policy) {
      const { data } = await supabase.from('provider_regions').select('*');
      return data || [];
    }

    const { data } = await supabase
      .from('provider_regions')
      .select('*')
      .in('region', policy.allowed_regions);

    return (data || []).filter((p: any) => {
      if (['PII', 'CONFIDENTIAL'].includes(dataClass) && !p.gdpr_compliant) return false;
      if (dataClass === 'PHI' && !p.hipaa_eligible) return false;
      return true;
    });
  }
}

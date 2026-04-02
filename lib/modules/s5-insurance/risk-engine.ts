import { createAdminClient } from '../../db/supabase';
import { AgentRiskProfile, PremiumCalculationResponse } from './types';

export class RiskEngine {
  /**
   * Calculates a dynamic risk score (0-100) for an agent based on recent telemetry.
   * 0 = Perfect health, 100 = Maximum risk.
   */
  static computeRiskScore(profile: AgentRiskProfile): { score: number; factors: string[] } {
    let score = 10; // Base baseline risk
    const factors: string[] = [];

    if (profile.total_violations > 0) {
      score += profile.total_violations * 5;
      factors.push(`Security Violations (+${profile.total_violations * 5})`);
    }

    if (profile.model_version_anomalies > 0) {
      score += profile.model_version_anomalies * 10;
      factors.push(`Model Anomalies (+${profile.model_version_anomalies * 10})`);
    }

    if (profile.hitl_escalations > 0) {
      // HITL escalations represent uncertainty but aren't explicitly malicious
      score += profile.hitl_escalations * 2;
      factors.push(`Human Escalations (+${profile.hitl_escalations * 2})`);
    }

    // S8 Moral conflict rate contribution (up to 25 points)
    if (profile.moral_conflicts && profile.moral_conflicts > 0) {
      const moralContribution = Math.min(profile.moral_conflicts * 2, 25);
      score += moralContribution;
      factors.push(`Moral Conflict Rate (+${moralContribution})`);
    }

    // Cap at 100
    if (score > 100) score = 100;
    
    // Reward perfection
    if (profile.total_violations === 0 && profile.model_version_anomalies === 0 && profile.hitl_escalations === 0) {
      score = 0;
      factors.push('Clean Record (0 risk)');
    }

    return { score, factors };
  }

  /**
   * Calculates a fraud score (0-100) for an agent based on violation history and claim frequency.
   * 0 = No fraud indicators, 100 = High fraud risk.
   */
  static computeFraudScore(profile: AgentRiskProfile, claimFrequency: number): { score: number; factors: string[] } {
    let score = 0;
    const factors: string[] = [];

    // Base score for any violations
    if (profile.total_violations > 0) {
      score += profile.total_violations * 4;
      factors.push(`Security Violations Index (+${profile.total_violations * 4})`);
    }

    // High frequency of SLA breaches (negligence/evasion indicator)
    if (profile.hitl_escalations > 2) {
      score += 15;
      factors.push('High SLA Breach Patterns (+15)');
    }

    // Increase score based on claim frequency
    if (claimFrequency > 0) {
      score += claimFrequency * 12;
      factors.push(`Frequent Claim Activity (+${claimFrequency * 12})`);
    }

    // High model anomalies (obfuscation indicator)
    if (profile.model_version_anomalies > 1) {
      score += profile.model_version_anomalies * 8;
      factors.push(`Persistent Model Anomalies (+${profile.model_version_anomalies * 8})`);
    }

    // Cap at 100
    if (score > 100) score = 100;

    return { score, factors };
  }

  /**
   * Applies compliance rules to a claim and tags it with relevant metadata (e.g., FCRA, NAIC).
   * This is a placeholder for more complex rule engines.
   */
  static applyComplianceRules(claimData: any): any {
    const complianceMetadata: { [key: string]: string } = {};

    // Example: Determine NAIC category based on incident type
    switch (claimData.incident_type) {
      case 'data_breach':
        complianceMetadata.naic_category = 'Cyber Liability';
        break;
      case 'system_failure':
        complianceMetadata.naic_category = 'Commercial Property';
        break;
      case 'permission_violation':
        complianceMetadata.naic_category = 'Commercial Liability';
        break;
      default:
        complianceMetadata.naic_category = 'General Liability';
        break;
    }

    // Example: Check for FCRA implications (e.g., if claim involves consumer data)
    if (claimData.incident_type === 'data_breach' && claimData.impact === 'consumer_data') {
      complianceMetadata.fcra_applicable = 'true';
    } else {
      complianceMetadata.fcra_applicable = 'false';
    }

    return {
      ...claimData,
      compliance_metadata: complianceMetadata,
    };
  }

  /**
   * Recomputes an agent's risk profile from the raw audit ledger and updates the S5 DB.
   */
  static async refreshAgentRiskProfile(tenantId: string, agentId: string): Promise<AgentRiskProfile> {
    const supabase = createAdminClient();

    // In a real production system, this would be an aggregated materialized view
    // or batch job. For MVP, we do live counts from the audit_events table.
    
    const { count: violations } = await supabase
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('event_type', 'agent.permission_violation');

    const { count: hitl } = await supabase
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('event_type', 'hitl.exception_created');

    const { count: anomalies } = await supabase
      .from('audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('event_type', 'model.version_anomaly_detected');

    // S8: Count moral conflicts (block counts as 3x pause) over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: moralPauses } = await supabase
      .from('moral_events')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('verdict', 'pause')
      .gte('created_at', thirtyDaysAgo);

    const { count: moralBlocks } = await supabase
      .from('moral_events')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('verdict', 'block')
      .gte('created_at', thirtyDaysAgo);

    const moralConflictRate = (moralPauses || 0) + (moralBlocks || 0) * 3;

    const profileData = {
      tenant_id: tenantId,
      agent_id: agentId,
      risk_score: 0, // Computed below
      total_violations: violations || 0,
      hitl_escalations: hitl || 0,
      model_version_anomalies: anomalies || 0,
      moral_conflicts: moralConflictRate,
      last_computed_at: new Date().toISOString()
    };

    const { score } = this.computeRiskScore(profileData as AgentRiskProfile);
    profileData.risk_score = score;

    // Upsert the risk profile
    const { data, error } = await supabase
      .from('agent_risk_profiles')
      .upsert(profileData, { onConflict: 'agent_id' })
      .select()
      .single();

    if (error) throw new Error(`Failed to refresh risk profile: ${error.message}`);
    return data;
  }

  /**
   * Calculates the dynamic insurance premium for an agent.
   */
  static async calculatePremium(tenantId: string, agentId: string): Promise<PremiumCalculationResponse> {
    const supabase = createAdminClient();

    // Ensure we have the latest risk data
    const profile = await this.refreshAgentRiskProfile(tenantId, agentId);
    const { score, factors } = this.computeRiskScore(profile);

    // Get the active coverage policy (assume 1 global tenant policy for MVP)
    const { data: policy } = await supabase
      .from('coverage_policies')
      .select('base_premium')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(1)
      .single();

    const basePremium = policy?.base_premium || 500.00; // $500 default base

    // Risk multiplier logic:
    // Risk 0-10: 1.0x
    // Risk 11-30: 1.2x
    // Risk 31-60: 1.5x
    // Risk 61-90: 2.0x
    // Risk 91-100: 3.0x
    let multiplier = 1.0;
    if (score > 10) multiplier = 1.2;
    if (score > 30) multiplier = 1.5;
    if (score > 60) multiplier = 2.0;
    if (score > 90) multiplier = 3.0;

    return {
      agent_id: agentId,
      base_premium: basePremium,
      risk_multiplier: multiplier,
      final_premium: basePremium * multiplier,
      risk_score: score,
      risk_factors: factors
    };
  }
}

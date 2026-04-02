import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';
import { HitlService } from '../s7-hitl/service';
import { SoulService } from './soul';
import { EvaluateMoralRequest, MoralVerdict, CorporateSoul, ROBO_DOMAIN_MAP } from './types';
import { v4 as uuidv4 } from 'uuid';

export class ConscienceEngine {
  /**
   * Evaluates an agent action against the Corporate SOUL.
   * Runs AFTER S6 permission check, BEFORE action execution.
   */
  static async evaluate(tenantId: string, request: EvaluateMoralRequest): Promise<MoralVerdict> {
    let soulData;
    try {
      soulData = await SoulService.getActiveSoul(tenantId);
    } catch {
      // No SOUL configured — everything is clear
      return { verdict: 'clear', domain: request.domain, soul_version: 0 };
    }

    const { soul, version } = soulData;
    const meta = request.action_metadata;
    const domain = request.domain;

    let verdict: MoralVerdict = { verdict: 'clear', domain, soul_version: version };

    // Domain-specific checks
    switch (domain) {
      case 'finance':
        verdict = this.checkFinance(soul, meta, version);
        break;
      case 'compliance':
        verdict = this.checkCompliance(soul, meta, version);
        break;
      case 'security':
        verdict = this.checkSecurity(soul, meta, version);
        break;
      case 'comms':
        verdict = this.checkComms(soul, meta, version);
        break;
      case 'ip':
        verdict = this.checkIP(soul, meta, version);
        break;
      default:
        verdict = { verdict: 'clear', domain, soul_version: version };
    }

    // Record non-clear verdicts
    if (verdict.verdict !== 'clear') {
      const supabase = createAdminClient();
      let oobTicketId: string | undefined;

      // For pause verdicts, create S7 HITL ticket
      if (verdict.verdict === 'pause') {
        const priorityMap: Record<string, 'critical' | 'high' | 'medium'> = {
          finance: 'critical', security: 'critical', compliance: 'high',
          comms: 'medium', ip: 'medium', ops: 'medium'
        };
        try {
          const ticket = await HitlService.createException(tenantId, request.agent_id, {
            title: `[MORAL CONFLICT] ${verdict.conflict_reason || 'Action paused by Corporate SOUL'}`,
            description: `Domain: ${domain}\nAction: ${request.action_description}\nEscalate to: ${verdict.escalate_to || 'manager'}`,
            priority: priorityMap[domain] || 'medium',
            context_data: { moral_verdict: verdict.verdict, conflict_reason: verdict.conflict_reason, escalate_to: verdict.escalate_to, soul_version: version }
          });
          oobTicketId = ticket.id;
        } catch (e) {
          console.error('Failed to create HITL ticket for moral pause:', e);
        }
      }

      // Write moral event
      await supabase.from('moral_events').insert({
        tenant_id: tenantId,
        agent_id: request.agent_id,
        action_description: request.action_description,
        domain,
        verdict: verdict.verdict,
        conflict_reason: verdict.conflict_reason || null,
        soul_version: version,
        oob_ticket_id: oobTicketId || null
      });

      // Audit ledger
      await AuditLedgerService.appendEvent({
        event_type: 'moral.conflict',
        module: 's8',
        tenant_id: tenantId,
        agent_id: request.agent_id,
        request_id: uuidv4(),
        payload: { domain, verdict: verdict.verdict, conflict_reason: verdict.conflict_reason, escalate_to: verdict.escalate_to }
      });
    }

    return verdict;
  }

  private static checkFinance(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const amount = meta.amount_usd as number | undefined;
    const vendor = meta.vendor as string | undefined;

    if (amount && amount > soul.financial.transaction_limit_usd) {
      return { verdict: 'block', domain: 'finance', conflict_reason: `Transaction $${amount} exceeds hard limit of $${soul.financial.transaction_limit_usd}`, soul_version: version };
    }
    if (amount && amount > soul.financial.require_cfo_above_usd) {
      return { verdict: 'pause', domain: 'finance', conflict_reason: `Transaction $${amount} requires CFO approval (threshold: $${soul.financial.require_cfo_above_usd})`, escalate_to: 'cfo', soul_version: version };
    }
    if (vendor && soul.financial.blocked_vendor_categories.includes(vendor)) {
      return { verdict: 'block', domain: 'finance', conflict_reason: `Vendor category "${vendor}" is blocked by Corporate SOUL`, soul_version: version };
    }
    return { verdict: 'clear', domain: 'finance', soul_version: version };
  }

  private static checkCompliance(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const isDeletion = meta.is_data_deletion as boolean | undefined;
    const targetRegion = meta.target_region as string | undefined;

    if (isDeletion && soul.compliance.require_dpo_for_deletion) {
      return { verdict: 'pause', domain: 'compliance', conflict_reason: 'Data deletion requires DPO approval', escalate_to: 'dpo', soul_version: version };
    }
    if (targetRegion && soul.compliance.data_residency_regions.length > 0 && !soul.compliance.data_residency_regions.includes(targetRegion)) {
      return { verdict: 'block', domain: 'compliance', conflict_reason: `Data residency violation: "${targetRegion}" not in allowed regions [${soul.compliance.data_residency_regions.join(', ')}]`, soul_version: version };
    }
    return { verdict: 'clear', domain: 'compliance', soul_version: version };
  }

  private static checkSecurity(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const isPrivEsc = meta.is_privilege_escalation as boolean | undefined;
    const targetEnv = meta.target_env as string | undefined;
    const egressDomain = meta.egress_domain as string | undefined;

    if (isPrivEsc && soul.security.no_self_privilege_escalation) {
      return { verdict: 'block', domain: 'security', conflict_reason: 'Self-privilege escalation is prohibited by Corporate SOUL', soul_version: version };
    }
    if (targetEnv === 'production' && soul.security.require_approval_for_prod_deploy) {
      return { verdict: 'pause', domain: 'security', conflict_reason: 'Production deployment requires CISO approval', escalate_to: 'ciso', soul_version: version };
    }
    if (egressDomain && soul.security.blocked_network_egress.includes(egressDomain)) {
      return { verdict: 'block', domain: 'security', conflict_reason: `Network egress to "${egressDomain}" is blocked`, soul_version: version };
    }
    return { verdict: 'clear', domain: 'security', soul_version: version };
  }

  private static checkComms(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const isBulkDelete = meta.is_bulk_delete as boolean | undefined;
    const resource = meta.resource as string | undefined;

    if (isBulkDelete && resource === 'email') {
      return { verdict: 'pause', domain: 'comms', conflict_reason: 'Bulk email deletion requires manager approval', escalate_to: 'manager', soul_version: version };
    }
    return { verdict: 'clear', domain: 'comms', soul_version: version };
  }

  private static checkIP(soul: CorporateSoul, meta: Record<string, unknown>, version: number): MoralVerdict {
    const targetDomain = meta.external_domain as string | undefined;
    const filePath = meta.file_path as string | undefined;

    if (targetDomain && soul.sensitive_data.blocked_external_domains.includes(targetDomain)) {
      return { verdict: 'block', domain: 'ip', conflict_reason: `External domain "${targetDomain}" is blocked for IP protection`, soul_version: version };
    }
    if (filePath && soul.sensitive_data.ip_protection_paths.some(p => filePath.startsWith(p))) {
      return { verdict: 'pause', domain: 'ip', conflict_reason: `File path "${filePath}" is under IP protection`, escalate_to: 'ciso', soul_version: version };
    }
    return { verdict: 'clear', domain: 'ip', soul_version: version };
  }
}

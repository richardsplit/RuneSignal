/**
 * AgentClassificationService — EU AI Act auto-classification.
 *
 * Classifies agents into EU AI Act risk categories based on metadata
 * and behavioral heuristics (keyword matching, escalation rate).
 *
 * EU AI Act Article 5  — Prohibited AI practices
 * EU AI Act Annex III  — High-risk AI systems
 * EU AI Act Article 52 — Transparency obligations (limited risk)
 *
 * Phase 5 Task 5.2.1
 */

import { createAdminClient } from '@lib/db/supabase';
import { AuditLedgerService } from '@lib/ledger/service';

export type EuAiActCategory = 'prohibited' | 'high_risk' | 'limited_risk' | 'minimal_risk';

export interface ClassificationResult {
  agent_id: string;
  previous_category: string | null;
  new_category: EuAiActCategory;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  classified_at: string;
  is_manual_override: boolean;
}

// ---------------------------------------------------------------------------
// Keyword lists for heuristic classification
// ---------------------------------------------------------------------------

const PROHIBITED_KEYWORDS = [
  'social scoring',
  'biometric identification',
  'real-time biometric',
  'manipulation',
  'subliminal',
  'exploitation',
];

const HIGH_RISK_DOMAIN_KEYWORDS = [
  'employment',
  'recruitment',
  'credit',
  'credit scoring',
  'law enforcement',
  'migration',
  'asylum',
  'border',
  'education',
  'critical infrastructure',
  'healthcare',
  'biometric',
  'judiciary',
];

const HIGH_RISK_TYPE_KEYWORDS = ['autonomous', 'decision-making'];

const LIMITED_RISK_KEYWORDS = [
  'chatbot',
  'assistant',
  'recommendation',
  'customer-facing',
  'user-facing',
];

const ESCALATION_RATE_THRESHOLD = 0.5; // 50%

export class AgentClassificationService {
  /**
   * Classify a single agent based on its metadata and behavior.
   * Updates agent_inventory record with new classification.
   * Respects manual overrides (skips if manually set).
   */
  static async classify(
    tenant_id: string,
    agent_id: string,
  ): Promise<ClassificationResult> {
    const supabase = createAdminClient();

    // 1. Load agent record from agent_inventory
    const { data: agent, error: agentError } = await supabase
      .from('agent_inventory')
      .select('*')
      .eq('id', agent_id)
      .eq('org_id', tenant_id)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agent_id}`);
    }

    const metadata = (agent.metadata as Record<string, unknown>) || {};
    const now = new Date().toISOString();

    // If manually overridden, return current classification without re-classifying
    if (metadata.classification_manual_override === true) {
      return {
        agent_id,
        previous_category: agent.eu_ai_act_category,
        new_category: agent.eu_ai_act_category as EuAiActCategory,
        confidence: 'high',
        reasoning: ['Manual override — skipping auto-classification'],
        classified_at: (metadata.classified_at as string) || now,
        is_manual_override: true,
      };
    }

    // 2. Load behavior signals from hitl_exceptions and audit_events
    const [hitlResult, auditResult] = await Promise.all([
      supabase
        .from('hitl_exceptions')
        .select('id, action_description', { count: 'exact' })
        .eq('tenant_id', tenant_id)
        .eq('agent_id', agent_id),
      supabase
        .from('audit_events')
        .select('id, payload', { count: 'exact' })
        .eq('tenant_id', tenant_id)
        .eq('agent_id', agent_id),
    ]);

    const hitlCount = hitlResult.count ?? 0;
    const auditCount = auditResult.count ?? 0;
    const totalActions = auditCount + hitlCount;

    // Build a searchable text corpus from agent metadata and event descriptions
    const hitlDescriptions = (hitlResult.data ?? [])
      .map((r) => (r.action_description as string) || '')
      .join(' ');
    const auditDescriptions = (auditResult.data ?? [])
      .map((r) => {
        const p = r.payload as Record<string, unknown> | null;
        return p?.description || p?.action || '';
      })
      .join(' ');

    const corpus = [
      agent.name,
      agent.description,
      agent.framework,
      hitlDescriptions,
      auditDescriptions,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // 3. Apply classification rules (first match wins)
    const reasoning: string[] = [];
    let category: EuAiActCategory = 'minimal_risk';
    let confidence: 'high' | 'medium' | 'low' = 'medium';

    // PROHIBITED check (Article 5)
    const prohibitedMatch = PROHIBITED_KEYWORDS.find((kw) => corpus.includes(kw));
    if (prohibitedMatch) {
      category = 'prohibited';
      confidence = 'high';
      reasoning.push(
        `Agent actions match prohibited AI practices under Article 5 (keyword: "${prohibitedMatch}")`,
      );
    }

    // HIGH_RISK check (Annex III)
    if (category === 'minimal_risk') {
      const domainMatch = HIGH_RISK_DOMAIN_KEYWORDS.find((kw) => corpus.includes(kw));
      if (domainMatch) {
        category = 'high_risk';
        confidence = 'high';
        reasoning.push(`Agent operates in Annex III high-risk domain: ${domainMatch}`);
      }

      if (category !== 'high_risk') {
        const typeMatch = HIGH_RISK_TYPE_KEYWORDS.find((kw) => corpus.includes(kw));
        if (typeMatch) {
          category = 'high_risk';
          confidence = 'medium';
          reasoning.push(`Agent type indicates high-risk autonomous decision-making (keyword: "${typeMatch}")`);
        }
      }

      if (category !== 'high_risk' && totalActions > 0) {
        const escalationRate = hitlCount / totalActions;
        if (escalationRate > ESCALATION_RATE_THRESHOLD) {
          category = 'high_risk';
          confidence = 'medium';
          reasoning.push(
            `Escalation rate (${(escalationRate * 100).toFixed(1)}%) exceeds 50% threshold`,
          );
        }
      }
    }

    // LIMITED_RISK check (Article 52)
    if (category === 'minimal_risk') {
      const limitedMatch = LIMITED_RISK_KEYWORDS.find((kw) => corpus.includes(kw));
      if (limitedMatch) {
        category = 'limited_risk';
        confidence = 'medium';
        reasoning.push(
          `Agent interacts directly with natural persons — Article 52 (keyword: "${limitedMatch}")`,
        );
      }
    }

    // MINIMAL_RISK (default)
    if (reasoning.length === 0) {
      reasoning.push('Default classification — internal tooling agent');
      confidence = 'low';
    }

    // 4. Update agent_inventory record
    const classificationMeta = {
      ...metadata,
      classification_reasoning: reasoning,
      classified_at: now,
      classification_confidence: confidence,
    };

    await supabase
      .from('agent_inventory')
      .update({
        eu_ai_act_category: category,
        metadata: classificationMeta,
      })
      .eq('id', agent_id)
      .eq('org_id', tenant_id);

    // 5. Log audit event
    try {
      await AuditLedgerService.appendEvent({
        event_type: 'agent.classified',
        module: 's6',
        tenant_id,
        agent_id,
        payload: {
          previous_category: agent.eu_ai_act_category,
          new_category: category,
          confidence,
          reasoning,
        },
      });
    } catch (err) {
      console.warn('[AgentClassificationService] Audit log failed:', err);
    }

    return {
      agent_id,
      previous_category: agent.eu_ai_act_category,
      new_category: category,
      confidence,
      reasoning,
      classified_at: now,
      is_manual_override: false,
    };
  }

  /**
   * Classify all agents for a tenant.
   * Skips agents with manual overrides.
   */
  static async classifyAll(tenant_id: string): Promise<ClassificationResult[]> {
    const supabase = createAdminClient();

    const { data: agents, error } = await supabase
      .from('agent_inventory')
      .select('id')
      .eq('org_id', tenant_id)
      .neq('status', 'decommissioned');

    if (error || !agents) {
      console.warn('[AgentClassificationService] Failed to load agents:', error?.message);
      return [];
    }

    const results: ClassificationResult[] = [];
    for (const agent of agents) {
      try {
        const result = await AgentClassificationService.classify(tenant_id, agent.id);
        results.push(result);
      } catch (err) {
        console.warn(`[AgentClassificationService] Failed to classify agent ${agent.id}:`, err);
      }
    }

    return results;
  }

  /**
   * Set manual override for an agent's classification.
   */
  static async setManualOverride(
    tenant_id: string,
    agent_id: string,
    category: EuAiActCategory,
    reason: string,
  ): Promise<void> {
    const supabase = createAdminClient();

    const { data: agent, error: agentError } = await supabase
      .from('agent_inventory')
      .select('metadata, eu_ai_act_category')
      .eq('id', agent_id)
      .eq('org_id', tenant_id)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agent_id}`);
    }

    const previousCategory = agent.eu_ai_act_category;
    const metadata = (agent.metadata as Record<string, unknown>) || {};
    const now = new Date().toISOString();

    const updatedMeta = {
      ...metadata,
      classification_manual_override: true,
      classification_manual_reason: reason,
      classification_reasoning: [`Manual override: ${reason}`],
      classified_at: now,
      classification_confidence: 'high',
    };

    const { error } = await supabase
      .from('agent_inventory')
      .update({
        eu_ai_act_category: category,
        metadata: updatedMeta,
      })
      .eq('id', agent_id)
      .eq('org_id', tenant_id);

    if (error) {
      throw new Error(`Failed to set manual override: ${error.message}`);
    }

    // Log audit event
    try {
      await AuditLedgerService.appendEvent({
        event_type: 'agent.classified',
        module: 's6',
        tenant_id,
        agent_id,
        payload: {
          previous_category: previousCategory,
          new_category: category,
          confidence: 'high',
          reasoning: [`Manual override: ${reason}`],
          is_manual_override: true,
        },
      });
    } catch (err) {
      console.warn('[AgentClassificationService] Audit log failed:', err);
    }
  }
}

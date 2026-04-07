import { createAdminClient } from '../../db/supabase';
import OpenAI from 'openai';

// This abstracts the LLM call that will read the raw JSON and output a human readable summary
// adhering to regulatory requirements.
export class ExplainabilityService {
  
  static async getExplanation(tenantId: string, certificateId: string) {
    const supabase = createAdminClient();
    const { data: expl } = await supabase.from('certificate_explanations')
      .select('*')
      .eq('certificate_id', certificateId)
      .eq('tenant_id', tenantId)
      .single();
    
    return expl;
  }

  private static COUNTERFACTUAL_TEMPLATES: Record<string, string> = {
    'blocked': 'If the agent intent had not matched a known risk pattern, the action would have been permitted.',
    'filtered': 'If the PII scrubbing module was disabled, the sensitive data would have reached the upstream provider.',
    'suspended': 'If the anomaly detector (S14) thresholds were higher, the agent would still be operational.',
  };

  /**
   * Generates a regulatory-compliant explanation including counterfactual analysis.
   */
  static async generateExplanation(tenantId: string, certificateId: string) {
    const supabase = createAdminClient();
    
    // 1. Retrieve the raw cryptographic ledger record
    const { data: event } = await supabase.from('audit_events')
      .select('*')
      .eq('request_id', certificateId)
      .eq('tenant_id', tenantId)
      .single();

    if (!event) throw new Error('Certificate not found in immutable ledger.');

    // 2. Fetch regulatory context mapping for the module
    const { data: regMap } = await supabase
      .from('explainability_regulatory_map')
      .select('framework, requirement_code, explanation_template')
      .eq('module_code', event.module || 'core')
      .limit(1)
      .single();

    // 3. Formulate Counterfactual ("What if?")
    let counterfactual = 'No significant deviations simulated.';
    if (event.event_type.includes('block') || event.event_type.includes('conflict')) {
      counterfactual = this.COUNTERFACTUAL_TEMPLATES['blocked'];
    } else if (event.event_type.includes('anomaly')) {
      counterfactual = this.COUNTERFACTUAL_TEMPLATES['suspended'];
    }

    let summary = '';
    let causalFactors: string[] = [];
    
    try {
      if (process.env.OPENAI_API_KEY) {
        const openai = new OpenAI();
        const prompt = `
        Analyze this AI governance event for a regulatory audit under ${regMap?.framework || 'General AI Ethics'}.
        Requirement: ${regMap?.requirement_code || 'Transparency'}.
        Event: ${event.event_type}
        Payload: ${JSON.stringify(event.payload)}
        
        Provide a JSON response with:
        {
          "summary": "Plain language explanation of why the AI behaved this way",
          "factors": ["List of core decision drivers"],
          "causality_chain": "Step-by-step logic flow"
        }`;
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: "json_object" },
          messages: [{ role: 'system', content: prompt }]
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        summary = result.summary || 'Summary generation failed structurally.';
        causalFactors = result.factors || ['Context processing'];
      } else {
        summary = regMap?.explanation_template || `Decision formulated by ${event.module} based on active security policy.`;
        causalFactors = ['Policy evaluation', 'Input sanitization'];
      }
    } catch (e) {
      summary = 'Manual audit required. Automated explanation engine encountered a processing error.';
      causalFactors = ['System error'];
    }

    const { data: newExpl } = await supabase.from('certificate_explanations').insert({
      tenant_id: tenantId,
      certificate_id: certificateId,
      decision_summary: summary,
      causal_factors: causalFactors,
      counterfactual_analysis: counterfactual,
      regulatory_mapping: {
        framework: regMap?.framework || 'Internal Governance',
        requirement: regMap?.requirement_code || 'Standard'
      },
      model_used: process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'deterministic-template'
    }).select().single();

    return newExpl;
  }
}

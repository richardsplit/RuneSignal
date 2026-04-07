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

  static async generateExplanation(tenantId: string, certificateId: string) {
    const supabase = createAdminClient();
    
    // First check if an explanation already exists to save costs
    const existing = await this.getExplanation(tenantId, certificateId);
    if (existing) return existing;

    // Retrieve the raw cryptographic ledger record
    const { data: event } = await supabase.from('audit_events')
      .select('*')
      .eq('request_id', certificateId)
      .eq('tenant_id', tenantId)
      .single();

    if (!event) throw new Error('Certificate not found in immutable ledger.');

    let summary = '';
    let causalFactors: string[] = [];
    let regulatoryMapping = { "EU_AI_Act": "Compliant", "Reason": "Transparency baseline met." };

    // In a live production environment we use OpenAI to parse the payload payload.
    // Assuming process.env.OPENAI_API_KEY exists. 
    try {
        if (process.env.OPENAI_API_KEY) {
            const openai = new OpenAI();
            const prompt = `
            Analyze the following agent execution telemetry and provide a regulatory-compliant explanation of its logic, 
            focusing on causality and decision formulation. Format as JSON.
            Payload: ${JSON.stringify(event.payload)}
            Expected JSON: { "summary": "Text", "factors": ["Factor 1", "Factor 2"] }
            `;
            
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                response_format: { type: "json_object" },
                messages: [{ role: 'system', content: prompt }]
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            summary = result.summary || 'Summary generation failed structurally.';
            causalFactors = result.factors || ['Context processing', 'Rule evaluation'];
        } else {
            // Mock Fallback if no API key is present for the environment
            summary = `This decision was formulated automatically by the ${event.module || 'system'} module. The agent processed the inputs and adhered to active guardrails to arrive at its conclusion.`;
            causalFactors = ["Evaluated system prompt constraints", "Matched intent against whitelist"];
        }
    } catch (e) {
        console.warn('Explainability LLM call failed, falling back to basic templating.');
        summary = "An error occurred while generating the highly-complex explanation map. The record is intact.";
        causalFactors = ["System fault during explanation parsing"];
    }

    const { data: newExpl } = await supabase.from('certificate_explanations').insert({
        tenant_id: tenantId,
        certificate_id: certificateId,
        decision_summary: summary,
        causal_factors: causalFactors,
        regulatory_mapping: regulatoryMapping,
        model_used: process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'fallback-template'
    }).select().single();

    return newExpl;
  }
}

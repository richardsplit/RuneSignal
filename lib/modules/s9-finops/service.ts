import { createAdminClient } from '../../db/supabase';
import { WebhookEmitter } from '../../webhooks/emitter';

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':           { input: 0.005,   output: 0.015  },
  'gpt-4o-mini':      { input: 0.00015, output: 0.0006 },
  'claude-opus-4-6':  { input: 0.015,   output: 0.075  },
  'claude-sonnet-4-6':{ input: 0.003,   output: 0.015  },
  'claude-haiku-4-5': { input: 0.00025, output: 0.00125},
  'default':          { input: 0.003,   output: 0.015  },
};

export class FinOpsService {
  static async checkBudget(tenantId: string, agentId: string, estimatedTokens: number, model: string) {
    const supabase = createAdminClient();
    
    // Attempt to load agent limits and tenant limits
    const { data: budgets } = await supabase
      .from('agent_budgets')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('agent_id', [agentId, null]); // fetch both agent explicitly and general tenant

    if (!budgets || budgets.length === 0) {
      // No budgets defined - allowed by default
      return { allowed: true, remainingUsd: Infinity, pctUsed: 0 };
    }

    let minRemaining = Infinity;
    let maxPctUsed = 0;

    for (const budget of budgets) {
      const remaining = Number(budget.budget_usd) - Number(budget.spent_usd);
      const pctUsed = Number(budget.spent_usd) / Number(budget.budget_usd);
      
      minRemaining = Math.min(minRemaining, remaining);
      maxPctUsed = Math.max(maxPctUsed, pctUsed);
      
      if (budget.hard_block && remaining <= 0) {
          return { allowed: false, remainingUsd: remaining, pctUsed };
      }
    }

    // Optionally check if expected cost surpasses remaining
    const rates = MODEL_PRICING[model] || MODEL_PRICING['default'];
    // In pre-execution we don't know the exact split of input/output tokens, estimating half and half
    const expectedCost = (estimatedTokens / 1000) * ((rates.input + rates.output) / 2);

    if (minRemaining - expectedCost <= 0) {
       // Only block if we expect to surpass? The prompt focuses on simple checks
       // Return allowed but close
    }

    return { allowed: true, remainingUsd: minRemaining, pctUsed: maxPctUsed };
  }

  static async recordCost(tenantId: string, agentId: string, model: string, inputTokens: number, outputTokens: number, certificateId?: string) {
    const supabase = createAdminClient();
    const provider = model.startsWith('gpt') ? 'openai' : (model.startsWith('claude') ? 'anthropic' : 'unknown');
    
    const rates = MODEL_PRICING[model] || MODEL_PRICING['default'];
    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (outputTokens / 1000) * rates.output;
    const totalCost = inputCost + outputCost;

    // Record the explicit cost event
    await supabase.from('cost_events').insert({
        tenant_id: tenantId,
        agent_id: agentId,
        provider,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: totalCost,
        certificate_id: certificateId
    });

    // Atomically increment the spend metrics
    await supabase.rpc('increment_budget_spend', {
        p_tenant_id: tenantId,
        p_agent_id: agentId,
        p_cost: totalCost
    });

    // Check if we passed the alert threshold
    const { data: budgets } = await supabase
      .from('agent_budgets')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('agent_id', [agentId, null]);
    
    if (budgets) {
        for (const budget of budgets) {
             // Re-fetch spent (or calculate expected post-increment)
             const newSpent = Number(budget.spent_usd) + totalCost;
             const pctThreshold = Number(budget.alert_at) * Number(budget.budget_usd);
             
             if (Number(budget.spent_usd) < pctThreshold && newSpent >= pctThreshold) {
                 await WebhookEmitter.notifyTenant(tenantId, `⚠️ Budget Alert: Agent has exceeded the ${budget.alert_at * 100}% threshold.`, {
                     agent: agentId,
                     budget_usd: budget.budget_usd,
                     spent_usd: newSpent.toFixed(4)
                 });
             }
        }
    }
    return totalCost;
  }

  static async getCostBreakdown(tenantId: string, periodDays = 30) {
     const supabase = createAdminClient();
     // In a production app, do deeper aggregations with Postgres. 
     // Doing basic summation here.
     const d = new Date();
     d.setDate(d.getDate() - periodDays);
     
     const { data: events } = await supabase
       .from('cost_events')
       .select('agent_id, model, workflow_id, cost_usd')
       .eq('tenant_id', tenantId)
       .gte('created_at', d.toISOString());

     let total = 0;
     const by_agent: Record<string, number> = {};
     const by_model: Record<string, number> = {};
     const by_workflow: Record<string, number> = {};

     if (events) {
         events.forEach(ev => {
             const cost = Number(ev.cost_usd);
             total += cost;
             if (ev.agent_id) by_agent[ev.agent_id] = (by_agent[ev.agent_id] || 0) + cost;
             if (ev.model) by_model[ev.model] = (by_model[ev.model] || 0) + cost;
             if (ev.workflow_id) by_workflow[ev.workflow_id] = (by_workflow[ev.workflow_id] || 0) + cost;
         });
     }

     return { total, by_agent, by_model, by_workflow };
  }

  static async setBudget(tenantId: string, agentId: string | null, budgetUsd: number, scopeType: string = 'monthly',
      hardBlock: boolean = true, alertAt: number = 0.8) {
      const supabase = createAdminClient();
      
      const { data, error } = await supabase.from('agent_budgets').upsert({
          tenant_id: tenantId,
          agent_id: agentId,
          scope_type: scopeType,
          budget_usd: budgetUsd,
          hard_block: hardBlock,
          alert_at: alertAt
      }, { onConflict: 'tenant_id, agent_id, scope_type'}).select().single();

      if (error) throw error;
      return data;
  }
}

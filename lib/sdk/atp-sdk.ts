import { ProvenanceResponse } from '../modules/s3-provenance/types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

/**
 * Enhanced wrapper SDK for intercepting LLM calls.
 * Now performs real upstream calls and cryptographic hashing.
 */
export class ATPClient {
  private provider: string;
  private apiKey: string;
  private atpKey: string;
  private atpEndpoint: string;
  private agentId?: string;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;

  constructor(config: { provider: string; apiKey: string; atpKey: string; atpEndpoint?: string; agentId?: string }) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.atpKey = config.atpKey;
    this.agentId = config.agentId;
    this.atpEndpoint = config.atpEndpoint || 'https://api.trustlayer.com';

    if (this.provider === 'openai') {
      this.openaiClient = new OpenAI({ apiKey: this.apiKey });
    } else if (this.provider === 'anthropic') {
      this.anthropicClient = new Anthropic({ apiKey: this.apiKey });
    }
  }

  /**
   * Helper to hash data for provenance verification.
   */
  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Performs an intercepted chat completion call.
   */
  async chat(params: {
    model: string;
    messages: any[];
    temperature?: number;
    tags?: string[];
    applicationId?: string;
    system?: string;
    dataClassification?: string; // ADD THIS
  }): Promise<ProvenanceResponse> {
    const startTime = Date.now();
    let completionText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    // 0. S10 Data Residency check — Only run for non-PUBLIC data
    if (params.dataClassification && params.dataClassification !== 'PUBLIC') {
      const residencyRes = await fetch(`${this.atpEndpoint}/api/v1/sovereign/validate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${this.atpKey}`,
          'X-Agent-Id': this.agentId || 'none'
        },
        body: JSON.stringify({
          provider: this.provider,
          model: params.model,
          data_classification: params.dataClassification
        })
      });
      
      const residencyData = await residencyRes.json();
      if (!residencyRes.ok) {
        console.warn(`[TrustLayer S10] Data residency violation: ${residencyData.violation_reason}`);
        if (residencyData.alternative_provider) {
          console.info(`[TrustLayer S10] Suggested compliant alternative: ${residencyData.alternative_provider.provider}/${residencyData.alternative_provider.model}`);
        }
        // Throw if hard-blocked (451), warn and continue otherwise
        if (residencyRes.status === 451) {
          throw new Error(`Data residency policy violation: ${residencyData.violation_reason}`);
        }
      }
    }

    // 1. FinOps Pre-execution check
    const estimatedTokens = params.messages.reduce((acc, m) => acc + (m.content?.length || 0) / 4, 0) + 1000;
    const checkStart = Date.now();
    const checkRes = await fetch(`${this.atpEndpoint}/api/v1/finops/check`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.atpKey}`,
            'X-Agent-Id': this.agentId || 'none'
        },
        body: JSON.stringify({
            model: params.model,
            estimated_tokens: estimatedTokens
        })
    });
    const atpPreOverhead = Date.now() - checkStart;

    if (checkRes.status === 402) {
       throw new Error('TrustLayer FinOps Error: Budget Exceeded. Call blocked prior to execution.');
    }

    // 2. Upstream LLM Call
    try {
      if (this.provider === 'openai' && this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature,
        });
        completionText = completion.choices[0].message.content || '';
        inputTokens = completion.usage?.prompt_tokens || 0;
        outputTokens = completion.usage?.completion_tokens || 0;
      } else if (this.provider === 'anthropic' && this.anthropicClient) {
        const msg = await this.anthropicClient.messages.create({
          model: params.model,
          max_tokens: 1024,
          system: params.system,
          messages: params.messages,
        });
        completionText = (msg.content[0] as any).text || '';
        inputTokens = msg.usage.input_tokens;
        outputTokens = msg.usage.output_tokens;
      } else {
        throw new Error('Unsupported provider or missing client initialization.');
      }
    } catch (err: any) {
      console.error('Upstream LLM Error:', err);
      throw err;
    }

    const upstreamLatency = Date.now() - startTime - atpPreOverhead;

    // 3. Certification via TrustLayer API
    // We send payload hashes + original metadata for archival
    const inputHash = this.generateHash(JSON.stringify(params.messages));
    const outputHash = this.generateHash(completionText);

    const certifyStart = Date.now();
    const certifyRes = await fetch(`${this.atpEndpoint}/api/v1/provenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.atpKey}`,
        'X-Agent-Id': this.agentId || 'none'
      },
      body: JSON.stringify({
        provider: this.provider,
        model: params.model,
        input_hash: inputHash,
        output_hash: outputHash,
        completion_text: completionText, // Still sent for archiving, but verified via hash
        user_messages: params.messages,
        temperature: params.temperature,
        tags: params.tags,
        application_id: params.applicationId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: upstreamLatency
      })
    });

    let certificateId = "uncertified";
    let signature = "none";
    let modelVersion = params.model;
    
    if (!certifyRes.ok) {
      console.warn("ATP Certification failed, returning uncertified response.");
    } else {
      const certData = await certifyRes.json();
      certificateId = certData.certificate_id;
      signature = certData.signature;
      modelVersion = certData.model_version || params.model;
    }
    
    // 4. FinOps Post-execution record (Fire and forget locally, though awaited here)
    fetch(`${this.atpEndpoint}/api/v1/finops/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.atpKey}`,
        'X-Agent-Id': this.agentId || 'none'
      },
      body: JSON.stringify({
         model: params.model,
         input_tokens: inputTokens,
         output_tokens: outputTokens,
         certificate_id: certificateId !== "uncertified" ? certificateId : undefined
      })
    }).catch(e => console.error("Failed to record FinOps cost:", e));

    const atpPostOverhead = Date.now() - certifyStart;

    return {
      content: completionText,
      certificate_id: certificateId,
      signature: signature,
      model_version: modelVersion,
      latency_ms: atpPreOverhead + atpPostOverhead
    };
  }
}

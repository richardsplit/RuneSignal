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
  }): Promise<ProvenanceResponse> {
    const startTime = Date.now();
    let completionText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    // 1. Upstream LLM Call
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

    const upstreamLatency = Date.now() - startTime;

    // 2. Certification via TrustLayer API
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

    if (!certifyRes.ok) {
      console.warn("ATP Certification failed, returning uncertified response.");
      return {
        content: completionText,
        certificate_id: "uncertified",
        signature: "none",
        model_version: params.model,
        latency_ms: upstreamLatency
      };
    }

    const certData = await certifyRes.json();
    const atpOverhead = Date.now() - certifyStart;

    return {
      content: completionText,
      certificate_id: certData.certificate_id,
      signature: certData.signature,
      model_version: certData.model_version || params.model,
      latency_ms: atpOverhead
    };
  }
}

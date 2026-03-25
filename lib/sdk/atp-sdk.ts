import { ProvenanceResponse } from '../modules/s3-provenance/types';

/**
 * Drop-in wrapper SDK for intercepting LLM calls on the client side.
 * In a real-world scenario, this might also be published as an npm package.
 */
export class ATPClient {
  private provider: string;
  private apiKey: string;
  private atpKey: string;
  private atpEndpoint: string;
  private agentId?: string;

  constructor(config: { provider: string; apiKey: string; atpKey: string; atpEndpoint?: string; agentId?: string }) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.atpKey = config.atpKey;
    this.agentId = config.agentId;
    this.atpEndpoint = config.atpEndpoint || 'https://api.trustlayer.com';
  }

  /**
   * Simulates a chat completion call that is intercepted by ATP.
   */
  async chat(params: {
    model: string;
    messages: any[];
    temperature?: number;
    tags?: string[];
    applicationId?: string;
  }): Promise<ProvenanceResponse> {
    const startTime = Date.now();

    // 1. Send purely to upstream LLM (simulated here for demonstration)
    // Normally this is where you call OpenAI SDK: `openai.chat.completions.create(...)`
    const mockUpstreamResponse = "Simulated AI response for testing S3 provenance.";
    const upstreamLatency = Date.now() - startTime;

    // 2. We have the inputs and the output. Hash and certify via TrustLayer API.
    const certifyStart = Date.now();
    const certifyRes = await fetch(`${this.atpEndpoint}/api/v1/provenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.atpKey}`
      },
      body: JSON.stringify({
        provider: this.provider,
        model: params.model,
        user_messages: params.messages,
        completion_text: mockUpstreamResponse,
        temperature: params.temperature,
        tags: params.tags,
        application_id: params.applicationId,
        input_tokens: 15, // mock
        output_tokens: 10, // mock
        latency_ms: upstreamLatency
      })
    });

    if (!certifyRes.ok) {
      console.warn("ATP Certification failed, returning uncertified response.");
      return {
        content: mockUpstreamResponse,
        certificate_id: "uncertified",
        signature: "none",
        model_version: "unknown",
        latency_ms: upstreamLatency
      };
    }

    const certData = await certifyRes.json();
    const atpOverhead = Date.now() - certifyStart;

    // 3. Return the enhanced ProvenanceResponse
    return {
      content: mockUpstreamResponse,
      certificate_id: certData.certificate_id,
      signature: certData.signature,
      model_version: certData.model_version,
      latency_ms: atpOverhead
    };
  }
}

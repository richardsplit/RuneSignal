export interface CertifyRequest {
  provider: 'openai' | 'anthropic' | 'azure';
  model: string;
  model_version?: string;
  system_prompt?: string;
  user_messages: any[];
  completion_text: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  temperature?: number;
  application_id?: string;
  tags?: string[];
}

export interface CertificatePayload {
  certificate_id: string;
  tenant_id: string;
  agent_id: string | null;
  provider: string;
  model: string;
  model_version: string;
  input_hash: string;
  output_hash: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  temperature: number;
  application_id: string;
  tags: string[];
  timestamp: string;
}

export interface ProvenanceResponse {
  content: string;
  certificate_id: string;
  signature: string;
  model_version: string;
  latency_ms: number;
}

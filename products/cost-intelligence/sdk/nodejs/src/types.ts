export interface RuneSignalConfig {
  apiKey: string;
  baseUrl?: string;
  enabled?: boolean;
}

export interface TrackOptions {
  customerId?: string;
  featureTag?: string;
  endpointId?: string;
}

export interface InferenceLog {
  tenant_api_key?: string;
  customer_id?: string | null;
  feature_tag?: string | null;
  endpoint_id?: string | null;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  cost_usd: number;
  latency_ms: number;
  request_id?: string | null;
}

/** Subset of OpenAI ChatCompletion response we care about */
export interface OpenAILikeResponse {
  id?: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
}

/** Subset of Anthropic Message response */
export interface AnthropicLikeResponse {
  id?: string;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export type LLMResponse = OpenAILikeResponse | AnthropicLikeResponse;

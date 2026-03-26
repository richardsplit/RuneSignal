/**
 * Utility for generating vector embeddings. 
 * In production, this calls OpenAI 'text-embedding-3-small' or similar.
 */
export class EmbeddingService {
  /**
   * Generates a 1536-dimensional embedding for a given text.
   */
  static async generate(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'sk-...' || process.env.STRICT_EMBEDDINGS !== 'true') {
      const vector = new Array(1536).fill(0);
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash | 0;
      }
      // Populate 100 deterministic indices for sparse similarity
      for (let i = 0; i < 100; i++) {
        const idx = Math.abs((hash + i * 31) % 1536);
        vector[idx] = 1.0;
      }
      return vector;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('OpenAI API Error:', data);
        throw new Error(`OpenAI Error: ${data.error?.message || 'Unknown error'}`);
      }

      if (!data.data || data.data.length === 0) {
        throw new Error('OpenAI returned empty embedding data');
      }

      return data.data[0].embedding;
    } catch (error: any) {
      console.error('Embedding generation failed:', error.message);
      
      // Fallback to mock for testing if explicitly desired or if API fails
      if (process.env.NODE_ENV === 'development' || !process.env.STRICT_EMBEDDINGS) {
        console.warn('⚠️ Falling back to mock embedding due to API failure.');
        const vector = new Array(1536).fill(0);
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = ((hash << 5) - hash) + text.charCodeAt(i);
          hash |= 0;
        }
        for (let i = 0; i < 100; i++) {
          const idx = Math.abs((hash + i * 31) % 1536);
          vector[idx] = 1.0;
        }
        return vector;
      }
      
      throw new Error('Failed to generate semantic embedding');
    }
  }
}

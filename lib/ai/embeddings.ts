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

    if (!apiKey || apiKey === 'sk-...') {
      // Mock embedding generator for MVP/Testing if no API key
      // Creates a deterministic 1536-dim vector based on the string content
      const vector = new Array(1536).fill(0);
      for (let i = 0; i < text.length; i++) {
        vector[i % 1536] = text.charCodeAt(i) / 255;
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
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw new Error('Failed to generate semantic embedding');
    }
  }
}

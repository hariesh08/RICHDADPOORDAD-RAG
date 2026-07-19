import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const ai = getGeminiClient();
  const embeddings: number[][] = [];
  const batchSize = 20;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: batch,
    });

    if (response.embeddings) {
      for (const emb of response.embeddings) {
        if (emb.values) {
          embeddings.push(emb.values);
        }
      }
    } else {
      throw new Error('No embedding values found in Gemini API response.');
    }
  }
  return embeddings;
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!url || !key || !geminiKey) {
      return res.status(500).json({ error: 'Missing environment variables' });
    }

    const { message, history, topK = 5, temperature = 0.2 } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Missing message parameter.' });
    }

    const supabase = createClient(url, key);

    const { count } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true });

    if (!count || count === 0) {
      return res.status(400).json({
        error: 'No book has been ingested. Visit /api/reset first.',
      });
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    let queryEmbedding: number[];
    try {
      const embResponse = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: [message],
        config: { outputDimensionality: 768 },
      });
      queryEmbedding = embResponse.embeddings?.[0]?.values || new Array(768).fill(0);
    } catch {
      queryEmbedding = new Array(768).fill(0);
    }

    const embeddingStr = JSON.stringify(queryEmbedding);
    const k = Math.max(0, Math.min(10, topK));

    const { data: retrieved, error: searchError } = await supabase.rpc('search_chunks', {
      query_embedding: embeddingStr,
      match_count: k,
    });

    if (searchError) {
      console.error('Vector search error:', searchError);
      return res.status(500).json({ error: 'Vector search failed: ' + searchError.message });
    }

    if (!retrieved || retrieved.length === 0) {
      return res.json({
        answer: "I couldn't find that information in the provided book.",
        sources: [],
        confidenceScore: 0,
      });
    }

    const contextText = retrieved
      .map(
        (r: any, idx: number) =>
          `[Chunk #${idx + 1} - Source: ${r.source} - Page: ${r.page_number}]\n${r.text}`
      )
      .join('\n\n-----------------\n\n');

    const systemPrompt = `You are a professional RAG Chatbot assistant specializing in answering questions ONLY from the book "Rich Dad Poor Dad".

RULES:
1. Answer the question using ONLY the provided Retrieved Context from the book.
2. Never make assumptions, invent facts, or use any outside knowledge not present in the Retrieved Context.
3. If the answer is not available or cannot be fully derived from the Retrieved Context, you must politely respond exactly with: "I couldn't find that information in the provided book."
4. When answering, always clearly attribute your points to the page numbers mentioned in the context (e.g., "According to page 35..." or "...(Page 35)").
5. Keep your tone objective, professional, and clear.`;

    const formattedHistory = (history || [])
      .map((h: any) => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
      .join('\n');

    const userPrompt = `Retrieved Context from "Rich Dad Poor Dad":
${contextText}

-----------------

Conversation History:
${formattedHistory}

Current User Question:
${message}

Provide your detailed RAG response here:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens: 1024,
      },
    });

    const answerText = response.text || "I couldn't find that information in the provided book.";

    const sanitizeSimilarity = (val: any): number => {
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };

    const topSimilarities = retrieved.slice(0, 3).map((r: any) => sanitizeSimilarity(r.similarity));
    const confidenceScore =
      topSimilarities.length > 0
        ? topSimilarities.reduce((a: number, b: number) => a + b, 0) / topSimilarities.length
        : 0;

    return res.json({
      answer: answerText,
      sources: retrieved.map((r: any, idx: number) => ({
        id: r.id || `chunk-${idx}`,
        text: r.text,
        pageNumber: r.page_number,
        chapter: r.chapter || null,
        source: r.source,
        similarity: sanitizeSimilarity(r.similarity),
      })),
      confidenceScore: parseFloat(confidenceScore.toFixed(3)),
    });
  } catch (err: any) {
    console.error('API Chat Error:', err);
    return res.status(500).json({ error: err.message || 'An error occurred.' });
  }
}

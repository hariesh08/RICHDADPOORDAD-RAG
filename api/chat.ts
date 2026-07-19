import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';
import { getGeminiClient, getEmbeddings } from './lib/gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history, topK = 5, temperature = 0.2 } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Missing message parameter.' });
    }

    const { count } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true });

    if (!count || count === 0) {
      return res.status(400).json({
        error: 'No book has been ingested or loaded into the vector database.',
      });
    }

    let queryEmbedding: number[];
    try {
      const embedResponse = await getEmbeddings([message]);
      queryEmbedding = embedResponse[0];
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
      return res.status(500).json({ error: 'Vector search failed.' });
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
3. If the answer is not available or cannot be fully derived from the Retrieved Context, you must politely respond exactly with:
   "I couldn't find that information in the provided book."
   Do not attempt to answer using outside knowledge or write a general summary.
4. When answering, always clearly attribute your points to the page numbers mentioned in the context (e.g., "According to page 35..." or "...(Page 35)").
5. Keep your tone objective, professional, and clear. Avoid overly dramatic expressions.`;

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

    const ai = getGeminiClient();
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

    const topSimilarities = retrieved.slice(0, 3).map((r: any) => r.similarity);
    const confidenceScore =
      topSimilarities.length > 0
        ? topSimilarities.reduce((a: number, b: number) => a + b, 0) / topSimilarities.length
        : 0;

    return res.json({
      answer: answerText,
      sources: retrieved.map((r: any) => ({
        id: r.id,
        text: r.text,
        pageNumber: r.page_number,
        chapter: r.chapter || null,
        source: r.source,
        similarity: r.similarity,
      })),
      confidenceScore: parseFloat(confidenceScore.toFixed(3)),
    });
  } catch (err: any) {
    console.error('API Chat Error:', err);
    return res.status(500).json({ error: err.message || 'An error occurred while processing your query.' });
  }
}

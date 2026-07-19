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

    const { fileBase64, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'Missing fileBase64 in request body.' });
    }

    const pdf = (await import('pdf-parse')).default;
    const buffer = Buffer.from(fileBase64, 'base64');
    const pdfData = await pdf(buffer);
    const pdfText = pdfData.text;
    const numPages = pdfData.numpages;

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from PDF.' });
    }

    const chunkSize = 700;
    const chunkOverlap = 150;
    const charsPerPage = pdfText.length / numPages;
    const chunks: { id: string; text: string; page_number: number; source: string }[] = [];

    let index = 0;
    let chunkIdCounter = 1;
    while (index < pdfText.length) {
      let end = index + chunkSize;
      if (end > pdfText.length) end = pdfText.length;

      const chunkText = pdfText.substring(index, end).trim();
      if (chunkText.length > 50) {
        const estimatedPage = Math.min(
          numPages,
          Math.max(1, Math.ceil((index + end) / 2 / charsPerPage))
        );
        chunks.push({
          id: `chunk-custom-${chunkIdCounter++}`,
          text: chunkText,
          page_number: estimatedPage,
          source: fileName || 'Uploaded PDF',
        });
      }

      if (end === pdfText.length) break;
      index += chunkSize - chunkOverlap;
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const chunkTexts = chunks.map((c) => `Page ${c.page_number}: ${c.text}`);

    const embResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: chunkTexts,
    });

    const embeddings: number[][] = [];
    if (embResponse.embeddings) {
      for (const emb of embResponse.embeddings) {
        if (emb.values) embeddings.push(emb.values);
      }
    }

    const rows = chunks.map((chunk, i) => ({
      id: chunk.id,
      text: chunk.text,
      page_number: chunk.page_number,
      source: chunk.source,
      chapter: null,
      embedding: JSON.stringify(embeddings[i] || new Array(768).fill(0)),
    }));

    const supabase = createClient(url, key);
    const { error } = await supabase.from('chunks').insert(rows);
    if (error) throw error;

    return res.json({
      success: true,
      message: `Ingested ${chunks.length} chunks from ${numPages} pages.`,
      bookName: fileName || 'Uploaded PDF',
      totalPages: numPages,
      chunksCount: chunks.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Upload failed.' });
  }
}

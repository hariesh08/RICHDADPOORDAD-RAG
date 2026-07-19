import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase';
import { getEmbeddings } from '../lib/gemini';
import { DEFAULT_BOOK_CHUNKS } from '../lib/chunks';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();

    const { count } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'Rich Dad Poor Dad');

    if (count && count > 0) {
      return res.json({
        success: true,
        message: 'Vector store already initialized with default chunks.',
        chunksCount: count,
        bookName: 'Rich Dad Poor Dad (Default Edition)',
        totalPages: 188,
      });
    }

    await supabase.from('chunks').delete().neq('id', '__nonexistent__');

    const texts = DEFAULT_BOOK_CHUNKS.map(
      (c) => `${c.chapter} (Page ${c.page_number}): ${c.text}`
    );
    const embeddings = await getEmbeddings(texts);

    const rows = DEFAULT_BOOK_CHUNKS.map((chunk, i) => ({
      id: chunk.id,
      text: chunk.text,
      page_number: chunk.page_number,
      source: chunk.source,
      chapter: chunk.chapter || null,
      embedding: JSON.stringify(embeddings[i]),
    }));

    const { error } = await supabase.from('chunks').insert(rows);
    if (error) throw error;

    return res.json({
      success: true,
      message: 'Reset vector store to default Rich Dad Poor Dad chunks.',
      chunksCount: rows.length,
      bookName: 'Rich Dad Poor Dad (Default Edition)',
      totalPages: 188,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to reset vector store.' });
  }
}

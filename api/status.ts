import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();
    const { count } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true });

    const hasApiKey = !!process.env.GEMINI_API_KEY;

    return res.json({
      status: 'ready',
      bookName: 'Rich Dad Poor Dad (Default Edition)',
      totalPages: 188,
      chunksCount: count || 0,
      embeddingModel: 'gemini-embedding-2-preview',
      llmModel: 'gemini-3.5-flash',
      hasApiKey,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabase = createClient(url, key);
    const { count } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true });

    return res.json({
      status: 'ready',
      bookName: 'Rich Dad Poor Dad (Default Edition)',
      totalPages: 188,
      chunksCount: count || 0,
      embeddingModel: 'text-embedding-004',
      llmModel: 'gemini-3.5-flash',
      hasApiKey: !!process.env.GEMINI_API_KEY,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

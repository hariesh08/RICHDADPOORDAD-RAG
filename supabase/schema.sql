-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Chunks table to store book text and embeddings
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'Rich Dad Poor Dad',
  chapter TEXT,
  embedding vector(768)
);

-- Index for faster similarity search
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 4);

-- Function to search similar chunks by embedding
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(768),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id TEXT,
  text TEXT,
  page_number INTEGER,
  source TEXT,
  chapter TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.text,
    c.page_number,
    c.source,
    c.chapter,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to check if default chunks exist
CREATE OR REPLACE FUNCTION has_default_chunks()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM chunks WHERE source = 'Rich Dad Poor Dad' LIMIT 1);
END;
$$;

-- Function to delete all chunks (for reset)
CREATE OR REPLACE FUNCTION delete_all_chunks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM chunks;
END;
$$;

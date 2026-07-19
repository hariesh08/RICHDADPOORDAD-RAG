DROP TABLE IF EXISTS chunks;
DROP FUNCTION IF EXISTS search_chunks;

CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'Rich Dad Poor Dad',
  chapter TEXT,
  embedding vector(768)
);

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

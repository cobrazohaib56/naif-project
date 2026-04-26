-- Per-user vector search for Ask AI.
-- The previous global match_rag_chunks + filter approach returned no rows when
-- the user's chunks were not among the top-N globally similar results.

CREATE OR REPLACE FUNCTION match_rag_chunks_for_user(
  query_embedding vector(384),
  owner_user_id uuid,
  match_count int DEFAULT 15
)
RETURNS TABLE (
  id uuid,
  rag_document_id uuid,
  chunk_text text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.rag_document_id,
    c.chunk_text,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM rag_chunks c
  INNER JOIN rag_documents d ON d.id = c.rag_document_id
  WHERE d.admin_id = owner_user_id
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

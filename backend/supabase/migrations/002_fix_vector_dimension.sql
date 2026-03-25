-- Fix vector dimension: all-MiniLM-L6-v2 produces 384-dim embeddings, not 768.
-- This migration updates existing databases that were created with the original 768-dim schema.

-- Drop the old index
DROP INDEX IF EXISTS idx_rag_chunks_embedding;

-- Change column type from vector(768) to vector(384)
ALTER TABLE rag_chunks ALTER COLUMN embedding TYPE vector(384);

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Recreate the match function with correct dimension
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(384),
  match_count int DEFAULT 5
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
    rag_chunks.id,
    rag_chunks.rag_document_id,
    rag_chunks.chunk_text,
    rag_chunks.metadata,
    1 - (rag_chunks.embedding <=> query_embedding) AS similarity
  FROM rag_chunks
  ORDER BY rag_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

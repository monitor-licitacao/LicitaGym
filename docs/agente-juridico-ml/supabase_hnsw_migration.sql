-- Migração: IVFFlat -> HNSW em legislacao_embeddings
-- Rodar no SQL Editor do Supabase (service role / postgres).
-- Cosine distance (<=>) com embeddings L2-normalized.

DROP INDEX IF EXISTS public.idx_legislacao_embedding;

CREATE INDEX IF NOT EXISTS idx_legislacao_embedding_hnsw
  ON public.legislacao_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Opcional: reforça search quality na sessão (Supabase pooler pode ignorar)
-- SET hnsw.ef_search = 40;

COMMENT ON INDEX public.idx_legislacao_embedding_hnsw IS
  'HNSW cosine for match_legislacao_embeddings; replaces IVFFlat (2026-09-21)';

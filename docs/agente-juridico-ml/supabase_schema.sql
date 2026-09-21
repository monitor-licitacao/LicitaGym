# Script SQL para criar tabelas no Supabase

-- Tabela principal de legislação
CREATE TABLE IF NOT EXISTS legislacao (
    id BIGSERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    numero VARCHAR(50) NOT NULL,
    ano INTEGER NOT NULL,
    data_publicacao TIMESTAMP WITH TIME ZONE,
    orgao_emissor TEXT,
    tipo VARCHAR(50) NOT NULL,
    ementa TEXT,
    texto_completo TEXT,
    url_origem TEXT,
    tags TEXT[],
    esfera VARCHAR(20),
    uf VARCHAR(2),
    municipio TEXT,
    palavras_chave TEXT[],
    artigos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_legislacao_tipo ON legislacao(tipo);
CREATE INDEX IF NOT EXISTS idx_legislacao_ano ON legislacao(ano);
CREATE INDEX IF NOT EXISTS idx_legislacao_esfera ON legislacao(esfera);
CREATE INDEX IF NOT EXISTS idx_legislacao_data ON legislacao(data_publicacao);
CREATE INDEX IF NOT EXISTS idx_legislacao_orgao ON legislacao(orgao_emissor);

-- Índice full-text para busca textual
CREATE INDEX IF NOT EXISTS idx_legislacao_texto ON legislacao USING GIN(to_tsvector('portuguese', texto_completo));

-- Tabela de embeddings vetoriais (requer extensão pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS legislacao_embeddings (
    id BIGSERIAL PRIMARY KEY,
    documento_id BIGINT REFERENCES legislacao(id) ON DELETE CASCADE,
    embedding vector(768),  -- Dimensão do modelo BERT
    texto_resumo TEXT,
    metadados JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por similaridade
-- HNSW (preferível a IVFFlat para corpus pequeno/médio e recall estável)
CREATE INDEX IF NOT EXISTS idx_legislacao_embedding_hnsw
    ON legislacao_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Tabela de histórico de consultas
CREATE TABLE IF NOT EXISTS consultas_log (
    id BIGSERIAL PRIMARY KEY,
    pergunta TEXT NOT NULL,
    classificacao JSONB,
    resultados_count INTEGER,
    tempo_processamento_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_legislacao_updated_at
    BEFORE UPDATE ON legislacao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Policies de segurança (RLS)
ALTER TABLE legislacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE legislacao_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas_log ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura pública
CREATE POLICY "Permitir leitura pública de legislação" ON legislacao
    FOR SELECT USING (true);

-- Policy para inserção apenas com autenticação
CREATE POLICY "Permitir inserção autenticada" ON legislacao
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização autenticada" ON legislacao
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grants para serviço role
GRANT ALL ON legislacao TO service_role;
GRANT ALL ON legislacao_embeddings TO service_role;
GRANT ALL ON consultas_log TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- RPC de busca semântica (Fase 1). Embedding deve ser L2-normalized se o índice
-- foi gravado com normalize=True (default do EmbeddingBackend).
-- Dimensão alinhada ao BERT base: 768.
CREATE OR REPLACE FUNCTION match_legislacao_embeddings(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    documento_id bigint,
    similaridade float,
    texto_resumo text,
    metadados jsonb
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        le.documento_id,
        (1 - (le.embedding <=> query_embedding))::float AS similaridade,
        le.texto_resumo,
        le.metadados
    FROM legislacao_embeddings le
    WHERE le.embedding IS NOT NULL
      AND (1 - (le.embedding <=> query_embedding)) >= match_threshold
    ORDER BY le.embedding <=> query_embedding
    LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_legislacao_embeddings(vector, float, int) TO service_role;
GRANT EXECUTE ON FUNCTION match_legislacao_embeddings(vector, float, int) TO authenticated;


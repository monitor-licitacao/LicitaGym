-- LicitaGym CATMAT Migrations (Endpoints 1-7)
-- Golden Rule: apenas G72 (classe 7220) e G78 (classe 7830)
-- Para inserir via Dashboard do Supabase: SQL Editor → copiar cada bloco e executar

-- ============================================================================
-- MIGRATION 1: Grupo Material (Endpoint 1)
-- ============================================================================
CREATE TABLE icatmat_grupo_material (
  id BIGSERIAL PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  nome_grupo VARCHAR(255) NOT NULL,
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE,
  payload_hash VARCHAR(32),
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  CONSTRAINT unique_grupo UNIQUE(codigo_grupo),
  CONSTRAINT unique_payload_hash UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_grupo_codigo ON icatmat_grupo_material(codigo_grupo);
CREATE INDEX idx_icatmat_grupo_sync ON icatmat_grupo_material(sync_timestamp);

-- ============================================================================
-- MIGRATION 2: Classe Material (Endpoint 2)
-- ============================================================================
CREATE TABLE icatmat_classe_material (
  id BIGSERIAL PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  codigo_classe INTEGER NOT NULL,
  nome_classe VARCHAR(255) NOT NULL,
  status_classe BOOLEAN DEFAULT TRUE,
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE,
  payload_hash VARCHAR(32),
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  CONSTRAINT check_classes CHECK (
    (codigo_grupo = 72 AND codigo_classe = 7220) OR
    (codigo_grupo = 78 AND codigo_classe = 7830)
  ),
  CONSTRAINT unique_classe UNIQUE(codigo_grupo, codigo_classe),
  CONSTRAINT unique_payload_hash UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_classe_grupo ON icatmat_classe_material(codigo_grupo);
CREATE INDEX idx_icatmat_classe_codigo ON icatmat_classe_material(codigo_classe);
CREATE INDEX idx_icatmat_classe_sync ON icatmat_classe_material(sync_timestamp);

-- ============================================================================
-- MIGRATION 3: PDM Material (Endpoint 3)
-- ============================================================================
CREATE TABLE icatmat_pdm_material (
  id BIGSERIAL PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  codigo_classe INTEGER NOT NULL,
  codigo_pdm INTEGER NOT NULL,
  nome_pdm VARCHAR(500) NOT NULL,
  status_pdm BOOLEAN DEFAULT TRUE,
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE,
  payload_hash VARCHAR(32),
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  CONSTRAINT check_classes CHECK (
    (codigo_grupo = 72 AND codigo_classe = 7220) OR
    (codigo_grupo = 78 AND codigo_classe = 7830)
  ),
  CONSTRAINT unique_pdm UNIQUE(codigo_grupo, codigo_classe, codigo_pdm),
  CONSTRAINT unique_payload_hash UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_pdm_grupo ON icatmat_pdm_material(codigo_grupo);
CREATE INDEX idx_icatmat_pdm_classe ON icatmat_pdm_material(codigo_classe);
CREATE INDEX idx_icatmat_pdm_codigo ON icatmat_pdm_material(codigo_pdm);
CREATE INDEX idx_icatmat_pdm_sync ON icatmat_pdm_material(sync_timestamp);

-- ============================================================================
-- MIGRATION 4: Item Material (Endpoint 4)
-- ============================================================================
CREATE TABLE icatmat_item_material (
  id BIGSERIAL PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  codigo_classe INTEGER NOT NULL,
  codigo_pdm INTEGER NOT NULL,
  codigo_item INTEGER NOT NULL,
  descricao_item VARCHAR(1000),
  tipo_item VARCHAR(100),
  status_item BOOLEAN DEFAULT TRUE,
  valor_unitario NUMERIC(15, 4),
  unidade_padrao VARCHAR(50),
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE,
  payload_hash VARCHAR(32),
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  CONSTRAINT check_classes CHECK (
    (codigo_grupo = 72 AND codigo_classe = 7220) OR
    (codigo_grupo = 78 AND codigo_classe = 7830)
  ),
  CONSTRAINT unique_item UNIQUE(codigo_grupo, codigo_classe, codigo_pdm, codigo_item),
  CONSTRAINT unique_payload_hash UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_item_grupo ON icatmat_item_material(codigo_grupo);
CREATE INDEX idx_icatmat_item_classe ON icatmat_item_material(codigo_classe);
CREATE INDEX idx_icatmat_item_pdm ON icatmat_item_material(codigo_pdm);
CREATE INDEX idx_icatmat_item_codigo ON icatmat_item_material(codigo_item);
CREATE INDEX idx_icatmat_item_sync ON icatmat_item_material(sync_timestamp);

-- ============================================================================
-- MIGRATION 5: Natureza Despesa (Endpoint 5)
-- ============================================================================
CREATE TABLE icatmat_natureza_despesa (
  id BIGSERIAL PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  codigo_classe INTEGER NOT NULL,
  codigo_item INTEGER NOT NULL,
  codigo_natureza INTEGER NOT NULL,
  descricao_natureza VARCHAR(500),
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE,
  payload_hash VARCHAR(32),
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  CONSTRAINT check_classes CHECK (
    (codigo_grupo = 72 AND codigo_classe = 7220) OR
    (codigo_grupo = 78 AND codigo_classe = 7830)
  ),
  CONSTRAINT unique_natureza UNIQUE(codigo_grupo, codigo_classe, codigo_item, codigo_natureza),
  CONSTRAINT unique_payload_hash UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_natureza_grupo ON icatmat_natureza_despesa(codigo_grupo);
CREATE INDEX idx_icatmat_natureza_classe ON icatmat_natureza_despesa(codigo_classe);
CREATE INDEX idx_icatmat_natureza_item ON icatmat_natureza_despesa(codigo_item);
CREATE INDEX idx_icatmat_natureza_codigo ON icatmat_natureza_despesa(codigo_natureza);
CREATE INDEX idx_icatmat_natureza_sync ON icatmat_natureza_despesa(sync_timestamp);

-- ============================================================================
-- MIGRATION 6: Unidade Fornecimento (Endpoint 6)
-- ============================================================================
CREATE TABLE icatmat_unidade_fornecimento (
  id BIGSERIAL PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  codigo_classe INTEGER NOT NULL,
  codigo_item INTEGER NOT NULL,
  codigo_unidade INTEGER NOT NULL,
  descricao_unidade VARCHAR(200),
  sigla_unidade VARCHAR(10),
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE,
  payload_hash VARCHAR(32),
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  CONSTRAINT check_classes CHECK (
    (codigo_grupo = 72 AND codigo_classe = 7220) OR
    (codigo_grupo = 78 AND codigo_classe = 7830)
  ),
  CONSTRAINT unique_unidade UNIQUE(codigo_grupo, codigo_classe, codigo_item, codigo_unidade),
  CONSTRAINT unique_payload_hash UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_unidade_grupo ON icatmat_unidade_fornecimento(codigo_grupo);
CREATE INDEX idx_icatmat_unidade_classe ON icatmat_unidade_fornecimento(codigo_classe);
CREATE INDEX idx_icatmat_unidade_item ON icatmat_unidade_fornecimento(codigo_item);
CREATE INDEX idx_icatmat_unidade_codigo ON icatmat_unidade_fornecimento(codigo_unidade);
CREATE INDEX idx_icatmat_unidade_sync ON icatmat_unidade_fornecimento(sync_timestamp);

-- ============================================================================
-- MIGRATION 7: Característica Material (Endpoint 7)
-- ============================================================================
CREATE TABLE icatmat_caracteristica_material (
  id BIGSERIAL PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  codigo_classe INTEGER NOT NULL,
  codigo_item INTEGER NOT NULL,
  codigo_caracteristica INTEGER NOT NULL,
  nome_caracteristica VARCHAR(300),
  descricao_caracteristica VARCHAR(1000),
  tipo_caracteristica VARCHAR(100),
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE,
  payload_hash VARCHAR(32),
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  CONSTRAINT check_classes CHECK (
    (codigo_grupo = 72 AND codigo_classe = 7220) OR
    (codigo_grupo = 78 AND codigo_classe = 7830)
  ),
  CONSTRAINT unique_caracteristica UNIQUE(codigo_grupo, codigo_classe, codigo_item, codigo_caracteristica),
  CONSTRAINT unique_payload_hash UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_caracteristica_grupo ON icatmat_caracteristica_material(codigo_grupo);
CREATE INDEX idx_icatmat_caracteristica_classe ON icatmat_caracteristica_material(codigo_classe);
CREATE INDEX idx_icatmat_caracteristica_item ON icatmat_caracteristica_material(codigo_item);
CREATE INDEX idx_icatmat_caracteristica_codigo ON icatmat_caracteristica_material(codigo_caracteristica);
CREATE INDEX idx_icatmat_caracteristica_sync ON icatmat_caracteristica_material(sync_timestamp);

-- Tabela unificada CATMAT consolidando 7 endpoints em um único registro
-- Grupo 72 (Utensílios e Utilidades de Uso Doméstico e Comercial)
-- Grupo 78 (Equipamentos para Recreação e Desportos)
-- Joins: Item (base) + Grupo + Classe + PDM + Características + Unidades + Naturezas Despesa

CREATE TABLE IF NOT EXISTS icatmat_pdm_completa (
  id BIGSERIAL PRIMARY KEY,

  -- Endpoint 1: consultarGrupoMaterial
  codigo_grupo INTEGER NOT NULL,
  nome_grupo TEXT,
  status_grupo_ep1 BOOLEAN,
  data_atualizacao_grupo TIMESTAMP,

  -- Endpoint 2: consultarClasseMaterial
  codigo_classe INTEGER,
  nome_classe TEXT,
  status_classe_ep2 BOOLEAN,
  data_atualizacao_classe TIMESTAMP,

  -- Endpoint 3: consultarPdmMaterial
  codigo_pdm INTEGER,
  nome_pdm TEXT,
  status_pdm_ep3 BOOLEAN,
  data_atualizacao_pdm TIMESTAMP,

  -- Endpoint 4: consultarItemMaterial (base chave)
  codigo_item BIGINT NOT NULL,
  descricao_item TEXT,
  status_item_ep4 BOOLEAN,
  item_sustentavel BOOLEAN,
  codigo_ncm TEXT,
  descricao_ncm TEXT,
  aplica_margem_preferencia BOOLEAN,
  data_atualizacao_item TIMESTAMP,

  -- Endpoint 5: consultarMaterialCaracteristicas (1-N agregado)
  codigo_caracteristica_first TEXT,
  nome_caracteristica_first TEXT,
  status_caracteristica_first BOOLEAN,
  codigo_valor_caracteristica_first TEXT,
  nome_valor_caracteristica_first TEXT,
  status_valor_caracteristica_first BOOLEAN,
  numero_caracteristica_first INTEGER,
  sigla_unidade_medida_caracteristica_first TEXT,
  caracteristicas JSONB DEFAULT '[]'::jsonb,
  data_atualizacao_caracteristicas TIMESTAMP,

  -- Endpoint 6: consultarMaterialUnidadeFornecimento (1-N agregado)
  sigla_unidade_fornecimento_first TEXT,
  nome_unidade_fornecimento_first TEXT,
  descricao_unidade_fornecimento_first TEXT,
  capacidade_unidade_fornecimento_first NUMERIC,
  numero_sequencial_unidade_first INTEGER,
  status_unidade_fornecimento_first BOOLEAN,
  status_unidade_first BOOLEAN,
  unidades_fornecimento JSONB DEFAULT '[]'::jsonb,
  data_atualizacao_unidades TIMESTAMP,

  -- Endpoint 7: consultarMaterialNaturezaDespesa (1-N agregado)
  codigo_natureza_despesa_first TEXT,
  nome_natureza_despesa_first TEXT,
  status_natureza_despesa_first BOOLEAN,
  naturezas_despesa JSONB DEFAULT '[]'::jsonb,
  data_atualizacao_naturezas TIMESTAMP,

  -- Rastreabilidade
  payload_hash TEXT UNIQUE,
  data_sincronizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_sync_completo TIMESTAMP,

  -- Constraints
  UNIQUE(codigo_item, codigo_grupo),
  CONSTRAINT chk_grupo_72_78 CHECK (codigo_grupo IN (72, 78))
);

-- Índices
CREATE INDEX idx_icatmat_grupo ON icatmat_pdm_completa(codigo_grupo);
CREATE INDEX idx_icatmat_item ON icatmat_pdm_completa(codigo_item);
CREATE INDEX idx_icatmat_pdm ON icatmat_pdm_completa(codigo_pdm);
CREATE INDEX idx_icatmat_classe ON icatmat_pdm_completa(codigo_classe);
CREATE INDEX idx_icatmat_sync ON icatmat_pdm_completa(data_sincronizacao DESC);

COMMENT ON TABLE icatmat_pdm_completa IS 'Catálogo CATMAT unificado (G72 Utensílios Doméstico-Comercial, G78 Equipamentos Desportos). Consolida 7 endpoints via JOINs (Grupo, Classe, PDM, Item como base) + agregações JSON (Características, Unidades Fornecimento, Naturezas Despesa).';

COMMENT ON COLUMN icatmat_pdm_completa.caracteristicas IS 'JSON array: [{codigoCaracteristica, nomeCaracteristica, codigoValorCaracteristica, nomeValorCaracteristica, numeroCaracteristica, siglaUnidadeMedida}]';

COMMENT ON COLUMN icatmat_pdm_completa.unidades_fornecimento IS 'JSON array: [{siglaUnidadeFornecimento, nomeUnidadeFornecimento, descricaoUnidadeFornecimento, siglaUnidadeMedida, capacidadeUnidadeFornecimento, numeroSequencialUnidadeFornecimento, statusUnidadeFornecimentoPdm, statusUnidadeFornecimento}]';

COMMENT ON COLUMN icatmat_pdm_completa.naturezas_despesa IS 'JSON array: [{codigoNaturezaDespesa, nomeNaturezaDespesa, statusNaturezaDespesa}]';

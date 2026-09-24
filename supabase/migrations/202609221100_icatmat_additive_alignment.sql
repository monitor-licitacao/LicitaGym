-- Migration: Additive Alignment for icatmat_* (E5-E7)
-- LOTE 5 — CATMAT: CATMAT-P0-003, CATMAT-P0-004, CATMAT-P1-001
-- Não destrutivo: adiciona colunas e índices aditivos sem DROP TABLE ou DROP CONSTRAINT existente.

-- 1. E7: icatmat_caracteristica_material
-- Adiciona colunas para valor de característica conforme DmMaterialCaracteristicasDTO (schemas-consultas.md §1.7)
-- e define política de nulo segura com sentinel '0' default.
ALTER TABLE icatmat_caracteristica_material
  ADD COLUMN IF NOT EXISTS codigo_valor_caracteristica VARCHAR(100) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS nome_valor_caracteristica VARCHAR(500);

-- Índice único aditivo para a chave natural canônica de características
CREATE UNIQUE INDEX IF NOT EXISTS idx_icatmat_caracteristica_natural
  ON icatmat_caracteristica_material (codigo_grupo, codigo_classe, codigo_item, codigo_caracteristica, codigo_valor_caracteristica);

-- 2. E5: icatmat_natureza_despesa
-- Índice aditivo cobrindo busca por PDM e natureza
CREATE INDEX IF NOT EXISTS idx_icatmat_natureza_pdm_despesa
  ON icatmat_natureza_despesa (codigo_pdm, codigo_natureza);

-- 3. E6: icatmat_unidade_fornecimento
-- Índice aditivo cobrindo busca por PDM e unidade/sigla
CREATE INDEX IF NOT EXISTS idx_icatmat_unidade_pdm_sigla
  ON icatmat_unidade_fornecimento (codigo_pdm, sigla_unidade, codigo_unidade);

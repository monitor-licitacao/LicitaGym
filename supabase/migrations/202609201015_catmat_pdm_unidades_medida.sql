-- Persist GET 6 fields omitted in v1:
-- DmMaterialUnidadeFornecimentoDTO.siglaUnidadeMedida
-- DmMaterialUnidadeFornecimentoDTO.capacidadeUnidadeFornecimento
--
-- These are the BASE measure unit + capacity of a supply unit for a PDM.
-- Do NOT join against catmat_item_caracteristicas.sigla_unidade_medida
-- (that column is the unit of a technical characteristic attribute).

ALTER TABLE public.catmat_pdm_unidades
  ADD COLUMN IF NOT EXISTS sigla_unidade_medida text,
  ADD COLUMN IF NOT EXISTS capacidade_unidade_fornecimento numeric;

COMMENT ON COLUMN public.catmat_pdm_unidades.sigla_unidade_fornecimento IS
  'Unidade de fornecimento / embalagem de compra (GET 6 siglaUnidadeFornecimento).';

COMMENT ON COLUMN public.catmat_pdm_unidades.sigla_unidade_medida IS
  'Unidade de medida base do PDM (GET 6 siglaUnidadeMedida). Distinta de catmat_item_caracteristicas.sigla_unidade_medida.';

COMMENT ON COLUMN public.catmat_pdm_unidades.capacidade_unidade_fornecimento IS
  'Quantidade da unidade de medida contida em uma unidade de fornecimento (GET 6 capacidadeUnidadeFornecimento).';

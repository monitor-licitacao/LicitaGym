ALTER TABLE public.pca_itens
  ADD COLUMN IF NOT EXISTS pdm_codigo_origem text,
  ADD COLUMN IF NOT EXISTS codigo_item_origem text;

COMMENT ON COLUMN public.pca_itens.pdm_codigo_origem IS
  'pdmCodigo informado pelo PNCP (PlanoContratacaoItemDTO). Atalho para pca_item_pdm.';

COMMENT ON COLUMN public.pca_itens.codigo_item_origem IS
  'codigoItem informado pelo PNCP. Alinha com catalogo_itens.codigo_catmat quando sincronizado.';

CREATE INDEX IF NOT EXISTS pca_itens_codigo_item_origen_idx
  ON public.pca_itens (codigo_item_origem)
  WHERE codigo_item_origem IS NOT NULL;

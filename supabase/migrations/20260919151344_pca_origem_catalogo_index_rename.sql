DROP INDEX IF EXISTS public.pca_itens_codigo_item_origen_idx;
CREATE INDEX IF NOT EXISTS pca_itens_codigo_item_origem_idx
  ON public.pca_itens (codigo_item_origem)
  WHERE codigo_item_origem IS NOT NULL;

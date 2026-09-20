-- Curadoria: Expandir escopo LicitaGym para incluir piso (extensão fora 78/7830)

-- Expandir CHECK constraint para aceitar 'piso'
ALTER TABLE public.catalogo_itens
  DROP CONSTRAINT IF EXISTS catalogo_itens_categoria_licitagym_check;

ALTER TABLE public.catalogo_itens
  ADD CONSTRAINT catalogo_itens_categoria_licitagym_check
    CHECK (categoria_licitagym IS NULL OR categoria_licitagym IN (
      'musculacao', 'cardio', 'acessorios', 'piso'
    ));

-- Índice para busca rápida de itens por categoria
CREATE INDEX IF NOT EXISTS catalogo_itens_categoria_licitagym_idx
  ON public.catalogo_itens (categoria_licitagym)
  WHERE categoria_licitagym IS NOT NULL;

-- Marcação de PDM de piso (a ser preenchido após descoberta de codigoPdm)
-- INSERT INTO public.catalogo_itens (codigo_pdm, categoria_licitagym, taxonomias, fonte_curadoria)
-- VALUES (
--   'XXXXXX',  -- substitua pelo codigoPdm descoberto
--   'piso',
--   '{"material": "piso", "subtipo": "borracha", "dimensoes": "50x50cm"}'::jsonb,
--   'manual'
-- )
-- ON CONFLICT (codigo_pdm) DO UPDATE SET
--   categoria_licitagym = 'piso',
--   taxonomias = excluded.taxonomias;

COMMENT ON CONSTRAINT catalogo_itens_categoria_licitagym_check ON public.catalogo_itens IS
  'Categoria de curadoria LicitaGym — musculacao, cardio, acessorios, piso. Piso é extensão fora 78/7830.';

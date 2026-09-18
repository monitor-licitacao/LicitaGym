-- Curadoria CATMAT LicitaGym (grupo 78 / classe 7830) em catalogo_itens

ALTER TABLE public.catalogo_itens
  ADD COLUMN IF NOT EXISTS grupo_catmat text,
  ADD COLUMN IF NOT EXISTS classe_catmat text,
  ADD COLUMN IF NOT EXISTS codigo_pdm text,
  ADD COLUMN IF NOT EXISTS categoria_licitagym text
    CHECK (categoria_licitagym IS NULL OR categoria_licitagym IN (
      'musculacao', 'cardio', 'acessorios'
    )),
  ADD COLUMN IF NOT EXISTS candidato_fitness boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxonomias jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fonte_curadoria text NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS catalogo_itens_codigo_catmat_idx
  ON public.catalogo_itens (codigo_catmat)
  WHERE codigo_catmat IS NOT NULL;

COMMENT ON COLUMN public.catalogo_itens.categoria_licitagym IS
  'Curadoria local LicitaGym — não é campo oficial CATMAT';
COMMENT ON COLUMN public.catalogo_itens.taxonomias IS
  'Campos extraídos do PDM (ex.: material, dimensões) — chave/valor literal';

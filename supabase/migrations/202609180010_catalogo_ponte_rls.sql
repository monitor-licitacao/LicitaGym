-- RLS em catalogo_ponte (lint) + policy em catalogo_especificacoes (007 habilitou RLS sem policy)

ALTER TABLE public.catalogo_ponte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogo_ponte_select ON public.catalogo_ponte;
CREATE POLICY catalogo_ponte_select
  ON public.catalogo_ponte
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS catalogo_especificacoes_select ON public.catalogo_especificacoes;
CREATE POLICY catalogo_especificacoes_select
  ON public.catalogo_especificacoes
  FOR SELECT
  TO authenticated
  USING (true);

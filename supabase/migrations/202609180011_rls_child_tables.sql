-- CLA-40: policies SELECT em tabelas filhas/junction (RLS habilitado sem policy nas migrations 003/005/006)

DROP POLICY IF EXISTS contratacoes_ata_participantes_select ON public.contratacoes_ata_participantes;
CREATE POLICY contratacoes_ata_participantes_select
  ON public.contratacoes_ata_participantes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS contratacoes_itens_select ON public.contratacoes_itens;
CREATE POLICY contratacoes_itens_select
  ON public.contratacoes_itens
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS contratacoes_resultados_select ON public.contratacoes_resultados;
CREATE POLICY contratacoes_resultados_select
  ON public.contratacoes_resultados
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS irp_participantes_select ON public.irp_participantes;
CREATE POLICY irp_participantes_select
  ON public.irp_participantes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS irp_eventos_select ON public.irp_eventos;
CREATE POLICY irp_eventos_select
  ON public.irp_eventos
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS legislacao_relacoes_select ON public.legislacao_relacoes;
CREATE POLICY legislacao_relacoes_select
  ON public.legislacao_relacoes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS legislacao_alertas_select ON public.legislacao_alertas;
CREATE POLICY legislacao_alertas_select
  ON public.legislacao_alertas
  FOR SELECT
  TO authenticated
  USING (true);

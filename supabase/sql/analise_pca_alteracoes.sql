-- Análise: pca_planos × pca_alteracoes (recorte Licitagym)
-- Executar no SQL Editor ou: psql ... -f supabase/sql/analise_pca_alteracoes.sql
--
-- Responde: quantas alterações existem, amostra dos 10 planos com mais registros,
-- órfãs (pca_plano_id NULL) e se o "por quê" está disponível nos dados.

-- =============================================================================
-- Parâmetro de escopo (gate explícito — classe vive em pca_itens, não em planos)
-- =============================================================================
-- Ajuste apenas esta linha para mudar o recorte:
\set classe_gate '7830'

-- Se o cliente não suporta \set, use a variante com CTE abaixo (substitua '7830').

-- =============================================================================
-- 1) Resumo global (com gate + órfãs)
-- =============================================================================
WITH params AS (
  SELECT :'classe_gate'::text AS classe_gate  -- psql; no Dashboard use literal '7830'
),
planos_recorte AS (
  SELECT p.id
  FROM public.pca_planos p
  CROSS JOIN params par
  WHERE EXISTS (
    SELECT 1
    FROM public.pca_itens i
    WHERE i.pca_plano_id = p.id
      AND i.classe_material_servico = par.classe_gate
  )
)
SELECT
  (SELECT count(*) FROM public.pca_alteracoes) AS total_tabela,
  (SELECT count(*)
   FROM public.pca_alteracoes a
   INNER JOIN planos_recorte pr ON pr.id = a.pca_plano_id) AS atribuidas_ao_recorte,
  (SELECT count(*) FROM public.pca_alteracoes WHERE pca_plano_id IS NULL) AS orfas_sem_plano,
  (SELECT count(*) FILTER (WHERE tipo_operacao = 'insert') FROM public.pca_alteracoes) AS inserts,
  (SELECT count(*) FILTER (WHERE tipo_operacao = 'update') FROM public.pca_alteracoes) AS updates,
  (SELECT count(*) FILTER (WHERE tipo_operacao = 'update' AND dados_novos IS NULL)
   FROM public.pca_alteracoes) AS updates_sem_payload,
  (SELECT count(DISTINCT sync_run_id) FROM public.pca_alteracoes) AS sync_runs_distintos;

-- =============================================================================
-- Variante Dashboard / Supabase MCP (sem psql \set) — descomente e rode sozinha:
-- =============================================================================
/*
WITH params AS (SELECT '7830'::text AS classe_gate),
planos_recorte AS (
  SELECT p.id, p.id_pca_pncp, p.orgao_cnpj
  FROM public.pca_planos p
  CROSS JOIN params par
  WHERE EXISTS (
    SELECT 1 FROM public.pca_itens i
    WHERE i.pca_plano_id = p.id AND i.classe_material_servico = par.classe_gate
  )
),
por_plano AS (
  SELECT
    pr.id,
    pr.id_pca_pncp,
    pr.orgao_cnpj,
    count(a.id) AS total_alteracoes,
    count(a.id) FILTER (WHERE a.tipo_operacao = 'insert') AS inserts,
    count(a.id) FILTER (WHERE a.tipo_operacao = 'update') AS updates,
    count(a.id) FILTER (WHERE a.tipo_operacao = 'update' AND a.dados_novos IS NULL) AS updates_sem_payload,
    CASE
      WHEN count(a.id) FILTER (WHERE a.tipo_operacao = 'update') = 0
        AND count(a.id) FILTER (WHERE a.tipo_operacao = 'insert') > 0
      THEN 'apenas_carga_ou_reprocessamento'
      WHEN count(a.id) FILTER (WHERE a.tipo_operacao = 'update' AND a.dados_novos IS NULL) > 0
      THEN 'updates_sem_diff_disponivel'
      ELSE 'updates_com_payload'
    END AS motivo_disponivel
  FROM planos_recorte pr
  LEFT JOIN public.pca_alteracoes a ON a.pca_plano_id = pr.id
  GROUP BY pr.id, pr.id_pca_pncp, pr.orgao_cnpj
),
resumo AS (
  SELECT
    'RESUMO'::text AS secao,
    NULL::uuid AS id,
    NULL::text AS id_pca_pncp,
    NULL::text AS orgao_cnpj,
    (SELECT count(*) FROM public.pca_alteracoes) AS total_alteracoes,
    (SELECT count(*) FROM public.pca_alteracoes WHERE pca_plano_id IS NULL) AS inserts,
    (SELECT count(*) FILTER (WHERE tipo_operacao = 'update') FROM public.pca_alteracoes) AS updates,
    (SELECT count(*) FILTER (WHERE tipo_operacao = 'update' AND dados_novos IS NULL) FROM public.pca_alteracoes) AS updates_sem_payload,
    'ver linha órfãs abaixo'::text AS motivo_disponivel
),
top10 AS (
  SELECT
    'TOP10'::text AS secao,
    id,
    id_pca_pncp,
    orgao_cnpj,
    total_alteracoes,
    inserts,
    updates,
    updates_sem_payload,
    motivo_disponivel
  FROM por_plano
  ORDER BY total_alteracoes DESC, id_pca_pncp
  LIMIT 10
),
orfas AS (
  SELECT
    'ORFAS'::text AS secao,
    NULL::uuid AS id,
    NULL::text AS id_pca_pncp,
    NULL::text AS orgao_cnpj,
    count(*) AS total_alteracoes,
    count(*) FILTER (WHERE tipo_operacao = 'insert') AS inserts,
    count(*) FILTER (WHERE tipo_operacao = 'update') AS updates,
    count(*) FILTER (WHERE tipo_operacao = 'update' AND dados_novos IS NULL) AS updates_sem_payload,
    'alterações de PLANO (pca_plano_id NULL) — fora do join com itens'::text AS motivo_disponivel
  FROM public.pca_alteracoes
  WHERE pca_plano_id IS NULL
)
SELECT * FROM resumo
UNION ALL
SELECT * FROM top10
UNION ALL
SELECT * FROM orfas
ORDER BY secao, total_alteracoes DESC NULLS LAST;
*/

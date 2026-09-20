-- Análise PCA alterações — versão única para Supabase SQL Editor / MCP
-- Gate explícito: ajuste classe_gate abaixo.

WITH params AS (
  SELECT '7830'::text AS classe_gate
),
planos_recorte AS (
  SELECT p.id, p.id_pca_pncp, p.orgao_cnpj
  FROM public.pca_planos p
  CROSS JOIN params par
  WHERE EXISTS (
    SELECT 1
    FROM public.pca_itens i
    WHERE i.pca_plano_id = p.id
      AND i.classe_material_servico = par.classe_gate
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
      WHEN count(a.id) = 0 THEN 'sem_alteracoes_atribuidas'
      WHEN count(a.id) FILTER (WHERE a.tipo_operacao = 'update') = 0
        AND count(a.id) FILTER (WHERE a.tipo_operacao = 'insert') > 0
      THEN 'apenas_insert_sync'
      WHEN count(a.id) FILTER (WHERE a.tipo_operacao = 'update' AND a.dados_novos IS NULL) > 0
      THEN 'motivo_indisponivel_só_hashes'
      ELSE 'motivo_disponivel_em_jsonb'
    END AS interpretacao_motivo
  FROM planos_recorte pr
  LEFT JOIN public.pca_alteracoes a ON a.pca_plano_id = pr.id
  GROUP BY pr.id, pr.id_pca_pncp, pr.orgao_cnpj
),
resumo AS (
  SELECT
    'RESUMO'::text AS secao,
    NULL::uuid AS plano_id,
    NULL::text AS id_pca_pncp,
    NULL::text AS orgao_cnpj,
    (SELECT count(*) FROM public.pca_alteracoes) AS total_alteracoes,
    (SELECT count(*) FILTER (WHERE tipo_operacao = 'insert') FROM public.pca_alteracoes) AS inserts,
    (SELECT count(*) FILTER (WHERE tipo_operacao = 'update') FROM public.pca_alteracoes) AS updates,
    (SELECT count(*) FILTER (WHERE tipo_operacao = 'update' AND dados_novos IS NULL)
     FROM public.pca_alteracoes) AS updates_sem_payload,
    (SELECT count(*)
     FROM public.pca_alteracoes a
     INNER JOIN planos_recorte pr ON pr.id = a.pca_plano_id)::text
      || ' atribuídas ao recorte; '
      || (SELECT count(*) FROM public.pca_alteracoes WHERE pca_plano_id IS NULL)::text
      || ' órfãs (plano)' AS interpretacao_motivo
),
top10 AS (
  SELECT
    'TOP10'::text AS secao,
    id AS plano_id,
    id_pca_pncp,
    orgao_cnpj,
    total_alteracoes,
    inserts,
    updates,
    updates_sem_payload,
    interpretacao_motivo
  FROM por_plano
  ORDER BY total_alteracoes DESC, id_pca_pncp
  LIMIT 10
),
orfas AS (
  SELECT
    'ORFAS'::text AS secao,
    NULL::uuid AS plano_id,
    NULL::text AS id_pca_pncp,
    NULL::text AS orgao_cnpj,
    count(*) AS total_alteracoes,
    count(*) FILTER (WHERE tipo_operacao = 'insert') AS inserts,
    count(*) FILTER (WHERE tipo_operacao = 'update') AS updates,
    count(*) FILTER (WHERE tipo_operacao = 'update' AND dados_novos IS NULL) AS updates_sem_payload,
    'histórico de upsert em pca_planos (pca_plano_id não preenchido)' AS interpretacao_motivo
  FROM public.pca_alteracoes
  WHERE pca_plano_id IS NULL
)
SELECT * FROM resumo
UNION ALL
SELECT * FROM top10
UNION ALL
SELECT * FROM orfas
ORDER BY secao, total_alteracoes DESC NULLS LAST;

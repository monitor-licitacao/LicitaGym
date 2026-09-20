-- Testes de integridade: pca_alteracoes
-- Cada bloco é um statement independente. Resultado esperado documentado ao lado.
-- Rodar todos e colar saídas no relatório.

-- #1 — tabela não vazia | esperado: > 0
SELECT count(*) AS teste_1_total_alteracoes FROM public.pca_alteracoes;

-- #2 — defeito A: alterações de plano sem pca_plano_id | esperado hoje: > 0
SELECT count(*) AS teste_2_orfas_pca_plano_id_null
FROM public.pca_alteracoes
WHERE pca_plano_id IS NULL;

-- #3 — defeito C: pca_item_id nunca preenchido | esperado hoje: 0
SELECT count(*) AS teste_3_com_pca_item_id
FROM public.pca_alteracoes
WHERE pca_item_id IS NOT NULL;

-- #4 — defeito B: updates sem dados_novos | esperado hoje: = total de updates
SELECT
  count(*) FILTER (WHERE tipo_operacao = 'update') AS total_updates,
  count(*) FILTER (WHERE tipo_operacao = 'update' AND dados_novos IS NULL) AS updates_sem_dados_novos
FROM public.pca_alteracoes;

-- #5 — defeito D: tipos gravados | esperado hoje: só insert e update
SELECT tipo_operacao, count(*) AS n
FROM public.pca_alteracoes
GROUP BY tipo_operacao
ORDER BY n DESC;

-- #6 — órfãs com FK quebrada | esperado: 0
SELECT count(*) AS teste_6_plano_id_inexistente
FROM public.pca_alteracoes a
WHERE a.pca_plano_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.pca_planos p WHERE p.id = a.pca_plano_id);

-- #7 — sync_run_id válido em private.pncp_sync_run | esperado: 0 inválidos (sem FK cross-schema)
SELECT count(*) AS teste_7_sync_run_invalido
FROM public.pca_alteracoes a
WHERE a.sync_run_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM private.pncp_sync_run r WHERE r.id = a.sync_run_id);

-- #8 — distribuição por sync_run (carga inicial = inserts)
SELECT sync_run_id, tipo_operacao, count(*) AS n
FROM public.pca_alteracoes
GROUP BY sync_run_id, tipo_operacao
ORDER BY n DESC
LIMIT 15;

-- #9 — gate: classes em pca_itens | esperado hoje: só 7830
SELECT DISTINCT classe_material_servico
FROM public.pca_itens
ORDER BY 1;

-- #10 — planos fora do recorte 7830 | esperado hoje: 0
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT count(*) AS teste_10_planos_sem_item_7830
FROM public.pca_planos p, params par
WHERE NOT EXISTS (
  SELECT 1 FROM public.pca_itens i
  WHERE i.pca_plano_id = p.id AND i.classe_material_servico = par.classe_gate
);

-- #11 — itens inclassificáveis | esperado: 0
SELECT count(*) AS teste_11_itens_classe_nula
FROM public.pca_itens
WHERE classe_material_servico IS NULL;

-- Gate A/B: total com vs sem filtro EXISTS (hoje devem coincidir no recorte fechado)
WITH params AS (SELECT '7830'::text AS classe_gate),
planos_recorte AS (
  SELECT p.id FROM public.pca_planos p, params par
  WHERE EXISTS (
    SELECT 1 FROM public.pca_itens i
    WHERE i.pca_plano_id = p.id AND i.classe_material_servico = par.classe_gate
  )
)
SELECT
  (SELECT count(*) FROM public.pca_alteracoes) AS sem_filtro_plano,
  (SELECT count(*) FROM public.pca_alteracoes a
   INNER JOIN planos_recorte pr ON pr.id = a.pca_plano_id) AS so_atribuidas_recorte,
  (SELECT count(*) FROM public.pca_alteracoes WHERE pca_plano_id IS NULL) AS orfas_nao_classificaveis;

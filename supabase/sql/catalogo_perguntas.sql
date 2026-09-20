-- Catálogo de perguntas — consultas canônicas (LicitaGym)
-- Cada bloco = um statement fechado (WITH próprio). Gate 7830 parametrizado no CTE `params`.
-- Resultado esperado (2026-09-19, ifaiagegyicjzlpskafh) em comentário acima de cada bloco.
-- IDs referenciam docs/pncp/catalogo-perguntas-assistente.md

-- =============================================================================
-- PCA-01 — Órgãos que planejaram academia em 2026 e quanto (top 20 por valor)
-- Esperado: 189 orgaos distintos no recorte; top orgao ~milhões em valor_total_estimado
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate, 2026 AS ano_exercicio)
SELECT
  p.orgao_cnpj,
  count(DISTINCT p.id) AS planos,
  count(pi.id) AS itens,
  sum(pi.valor_total_estimado) AS valor_total_estimado
FROM public.pca_planos p
JOIN public.pca_itens pi ON pi.pca_plano_id = p.id
CROSS JOIN params par
WHERE p.ativo AND pi.ativo
  AND pi.classe_material_servico = par.classe_gate
  AND p.ano_exercicio = par.ano_exercicio
GROUP BY p.orgao_cnpj
ORDER BY valor_total_estimado DESC NULLS LAST
LIMIT 20;

-- =============================================================================
-- PCA-02 — Quantos planos no recorte?
-- Esperado: 475
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT count(DISTINCT p.id) AS planos_recorte
FROM public.pca_planos p
CROSS JOIN params par
WHERE p.ativo
  AND EXISTS (
    SELECT 1 FROM public.pca_itens i
    WHERE i.pca_plano_id = p.id AND i.classe_material_servico = par.classe_gate
  );

-- =============================================================================
-- PCA-03 — Quantos itens ativos classe 7830?
-- Esperado: 3220
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT count(*) AS itens_ativos
FROM public.pca_itens pi, params par
WHERE pi.ativo AND pi.classe_material_servico = par.classe_gate;

-- =============================================================================
-- PCA-04 — Itens PCA sem PDM vinculado (pca_item_pdm)
-- Esperado: 2993 (ativos sem linha em pca_item_pdm)
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT count(*) AS itens_sem_pdm
FROM public.pca_itens pi, params par
WHERE pi.ativo AND pi.classe_material_servico = par.classe_gate
  AND NOT EXISTS (
    SELECT 1 FROM public.pca_item_pdm pip WHERE pip.pca_item_id = pi.id
  );

-- =============================================================================
-- PCA-05 — Total de alterações registradas (com órfãs explícitas)
-- Esperado: total 3792; orfas 513; atribuidas_recorte 3279
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate),
planos_recorte AS (
  SELECT p.id FROM public.pca_planos p, params par
  WHERE EXISTS (
    SELECT 1 FROM public.pca_itens i
    WHERE i.pca_plano_id = p.id AND i.classe_material_servico = par.classe_gate
  )
)
SELECT
  (SELECT count(*) FROM public.pca_alteracoes) AS total,
  (SELECT count(*) FROM public.pca_alteracoes WHERE pca_plano_id IS NULL) AS orfas_plano,
  (SELECT count(*) FROM public.pca_alteracoes a
   INNER JOIN planos_recorte pr ON pr.id = a.pca_plano_id) AS atribuidas_recorte;

-- =============================================================================
-- PCA-06 — Planos com mais alterações atribuídas (top 10)
-- Esperado: max 84 alterações (46377800000127-0-000073/2026), só inserts
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate),
planos_recorte AS (
  SELECT p.id, p.id_pca_pncp, p.orgao_cnpj
  FROM public.pca_planos p, params par
  WHERE EXISTS (
    SELECT 1 FROM public.pca_itens i
    WHERE i.pca_plano_id = p.id AND i.classe_material_servico = par.classe_gate
  )
)
SELECT pr.id_pca_pncp, pr.orgao_cnpj, count(a.id) AS alteracoes
FROM planos_recorte pr
LEFT JOIN public.pca_alteracoes a ON a.pca_plano_id = pr.id
GROUP BY pr.id, pr.id_pca_pncp, pr.orgao_cnpj
ORDER BY alteracoes DESC, pr.id_pca_pncp
LIMIT 10;

-- =============================================================================
-- PCA-07 — BLOQUEADO: diff campo a campo ("por que mudou?")
-- Esperado: updates_sem_payload = 73 (= todos os updates legados); com_pca_item_id pode subir após deploy
-- Assistente RECUSA inventar diff; pode oferecer PCA-07b (metadados de sync)
-- =============================================================================
SELECT
  count(*) FILTER (WHERE tipo_operacao = 'update') AS total_updates,
  count(*) FILTER (WHERE tipo_operacao = 'update' AND dados_novos IS NULL) AS updates_sem_payload,
  count(*) FILTER (WHERE pca_item_id IS NOT NULL) AS com_pca_item_id,
  count(*) FILTER (WHERE pca_plano_id IS NULL) AS orfas;

-- =============================================================================
-- PCA-07b — Metadados registrados (não é motivo de negócio)
-- Esperado: linhas por tipo_operacao + sync_run_id quando pca_item_id preenchido
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT a.tipo_operacao, count(*) AS registros, count(DISTINCT a.sync_run_id) AS runs_distintos
FROM public.pca_alteracoes a
JOIN public.pca_itens pi ON pi.id = a.pca_item_id
CROSS JOIN params par
WHERE pi.ativo AND pi.classe_material_servico = par.classe_gate
GROUP BY a.tipo_operacao
ORDER BY registros DESC;

-- =============================================================================
-- PCA-08 — PDMs candidatos por classe (exploratório; até 49 por item)
-- Esperado: join retorna linhas; 49 PDMs distintos classe 7830
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT count(DISTINCT cp.codigo_pdm) AS pdms_distintos_classe
FROM public.pca_itens pi
JOIN public.catmat_pdms cp ON cp.codigo_classe = pi.codigo_classe_catmat
CROSS JOIN params par
WHERE pi.ativo AND pi.classe_material_servico = par.classe_gate;

-- =============================================================================
-- PCA-09 — Itens com PDM confirmado
-- Esperado: 181 confirmados=true
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT count(*) AS pdm_confirmados
FROM public.pca_item_pdm pip
JOIN public.pca_itens pi ON pi.id = pip.pca_item_id
CROSS JOIN params par
WHERE pi.ativo AND pi.classe_material_servico = par.classe_gate
  AND pip.confirmado = true;

-- =============================================================================
-- PONTE-01 — Itens PCA com equivalência no catálogo LicitaGym (ponte ou codigoItem PNCP)
-- Esperado: com_equivalencia << 3220 enquanto link-catmat-pca parcial; total pontes ~222
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT
  count(*) AS itens_recorte,
  count(*) FILTER (WHERE tem_equivalencia) AS com_equivalencia_catalogo,
  count(*) FILTER (WHERE NOT tem_equivalencia) AS sem_equivalencia_catalogo
FROM (
  SELECT pi.id,
    EXISTS (
      SELECT 1 FROM public.catalogo_ponte cp
      WHERE cp.entidade_tipo = 'pca_item' AND cp.entidade_id = pi.id
    )
    OR EXISTS (
      SELECT 1 FROM public.catalogo_itens ci
      WHERE ci.ativo AND ci.codigo_catmat = pi.codigo_item_origem
    ) AS tem_equivalencia
  FROM public.pca_itens pi
  CROSS JOIN params par
  WHERE pi.ativo AND pi.classe_material_servico = par.classe_gate
) sub;

-- =============================================================================
-- PONTE-02 — Itens PCA sem equivalência no catálogo LicitaGym
-- Esperado: ~2998 (= 3220 - com_equivalencia do bloco PONTE-01)
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT count(*) AS itens_sem_equivalencia_catalogo
FROM public.pca_itens pi
CROSS JOIN params par
WHERE pi.ativo AND pi.classe_material_servico = par.classe_gate
  AND NOT EXISTS (
    SELECT 1 FROM public.catalogo_ponte cp
    WHERE cp.entidade_tipo = 'pca_item' AND cp.entidade_id = pi.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.catalogo_itens ci
    WHERE ci.ativo AND ci.codigo_catmat = pi.codigo_item_origem
  );

-- =============================================================================
-- PONTE-03 — Distribuição de confiança na ponte PCA↔catálogo
-- Esperado: mix exata/provavel/incerta; evidencia pncp: vs jaccard=
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT cp.tipo_correspondencia, count(*) AS pontes
FROM public.catalogo_ponte cp
JOIN public.pca_itens pi ON pi.id = cp.entidade_id
CROSS JOIN params par
WHERE cp.entidade_tipo = 'pca_item'
  AND pi.ativo AND pi.classe_material_servico = par.classe_gate
GROUP BY cp.tipo_correspondencia
ORDER BY pontes DESC;

-- =============================================================================
-- PRECO-01 — Diagnóstico: preço praticado (nao-aplicado até migration)
-- Esperado: tabela_existe = false; assistente RECUSA PRECO-01/02/03
-- =============================================================================
SELECT to_regclass('public.precos_praticados_itens') IS NOT NULL AS tabela_existe;

-- =============================================================================
-- CONTR-01 — Editais ligados a PCA academia (domínio vazio hoje)
-- Esperado: 0
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate),
planos_recorte AS (
  SELECT p.id FROM public.pca_planos p, params par
  WHERE p.ativo AND EXISTS (
    SELECT 1 FROM public.pca_itens i
    WHERE i.pca_plano_id = p.id AND i.classe_material_servico = par.classe_gate
  )
)
SELECT count(*) AS editais_ligados_pca_recorte
FROM public.contratacoes_editais ce
INNER JOIN planos_recorte pr ON pr.id = ce.pca_plano_id;

-- =============================================================================
-- CAT-01 — PDMs ativos classe 7830
-- Esperado: 49
-- =============================================================================
SELECT count(*) AS pdms_classe_7830
FROM public.catmat_pdms
WHERE codigo_classe = 7830 AND status = true;

-- =============================================================================
-- CAT-02 — Unidades de fornecimento por PDM (exemplo: primeiro PDM da classe)
-- Esperado: > 0 linhas para PDMs com unidades sincronizadas (56 total na tabela)
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate),
sample_pdm AS (
  SELECT codigo_pdm FROM public.catmat_pdms
  WHERE codigo_classe = 7830 AND status = true LIMIT 1
)
SELECT u.codigo_pdm, u.numero_sequencial, u.sigla_unidade_fornecimento, u.nome_unidade_fornecimento, u.status
FROM public.catmat_pdm_unidades u
JOIN sample_pdm s ON s.codigo_pdm = u.codigo_pdm
ORDER BY u.numero_sequencial;

-- =============================================================================
-- CAT-03 — Características de item CATMAT (via codigo_catmat texto → int)
-- Esperado: > 0 para itens com características sincronizadas (2992 linhas totais)
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate),
sample_item AS (
  SELECT ci.codigo_catmat
  FROM public.catalogo_itens ci
  CROSS JOIN params par
  WHERE ci.classe_catmat = par.classe_gate AND ci.ativo
  LIMIT 1
)
SELECT count(*) AS caracteristicas_do_item
FROM public.catmat_item_caracteristicas c
JOIN sample_item s ON c.codigo_item = s.codigo_catmat::int;

-- =============================================================================
-- CAT-04 — Itens catálogo LicitaGym classe 7830
-- Esperado: 594
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT count(*) AS catalogo_itens_7830
FROM public.catalogo_itens ci, params par
WHERE ci.ativo AND ci.classe_catmat = par.classe_gate;

-- =============================================================================
-- CAT-05 — VAZIO: natureza de despesa por PDM
-- Esperado: 0 linhas (tabela catmat_pdm_naturezas_despesa vazia)
-- =============================================================================
SELECT count(*) AS naturezas_despesa
FROM public.catmat_pdm_naturezas_despesa;

-- =============================================================================
-- ORG-01 — Órgãos distintos no PCA (via CNPJ denormalizado, não tabela orgaos)
-- Esperado: 189
-- =============================================================================
WITH params AS (SELECT '7830'::text AS classe_gate)
SELECT count(DISTINCT p.orgao_cnpj) AS orgaos_cnpj_distintos
FROM public.pca_planos p
CROSS JOIN params par
WHERE p.ativo
  AND EXISTS (
    SELECT 1 FROM public.pca_itens i
    WHERE i.pca_plano_id = p.id AND i.classe_material_servico = par.classe_gate
  );

-- =============================================================================
-- PROV-01 — Sync runs com alterações PCA
-- Esperado: 217 sync_run_id distintos em pca_alteracoes
-- =============================================================================
SELECT count(DISTINCT sync_run_id) AS runs_com_alteracao_pca
FROM public.pca_alteracoes;

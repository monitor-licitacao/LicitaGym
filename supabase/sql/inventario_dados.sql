-- Inventário de linhas — LicitaGym (Fase 0 do catálogo de perguntas)
-- Um statement. Reexecutar após cada carga de sync; comparar com docs/pncp/inventario-dados.md
-- Projeto: ifaiagegyicjzlpskafh | Gerado: 2026-09-19

WITH counts AS (
  SELECT 'public.pca_planos' AS tabela, count(*)::bigint AS linhas FROM public.pca_planos
  UNION ALL SELECT 'public.pca_itens', count(*) FROM public.pca_itens
  UNION ALL SELECT 'public.pca_alteracoes', count(*) FROM public.pca_alteracoes
  UNION ALL SELECT 'public.pca_item_pdm', count(*) FROM public.pca_item_pdm
  UNION ALL SELECT 'public.catalogo_itens', count(*) FROM public.catalogo_itens
  UNION ALL SELECT 'public.catalogo_ponte', count(*) FROM public.catalogo_ponte
  UNION ALL SELECT 'public.catalogo_especificacoes', count(*) FROM public.catalogo_especificacoes
  UNION ALL SELECT 'public.categoria_item_pca', count(*) FROM public.categoria_item_pca
  UNION ALL SELECT 'public.catmat_grupos', count(*) FROM public.catmat_grupos
  UNION ALL SELECT 'public.catmat_classes', count(*) FROM public.catmat_classes
  UNION ALL SELECT 'public.catmat_pdms', count(*) FROM public.catmat_pdms
  UNION ALL SELECT 'public.catmat_pdm_unidades', count(*) FROM public.catmat_pdm_unidades
  UNION ALL SELECT 'public.catmat_pdm_naturezas_despesa', count(*) FROM public.catmat_pdm_naturezas_despesa
  UNION ALL SELECT 'public.catmat_item_caracteristicas', count(*) FROM public.catmat_item_caracteristicas
  UNION ALL SELECT 'public.entidades', count(*) FROM public.entidades
  UNION ALL SELECT 'public.orgaos', count(*) FROM public.orgaos
  UNION ALL SELECT 'public.unidades', count(*) FROM public.unidades
  UNION ALL SELECT 'public.contratacoes_editais', count(*) FROM public.contratacoes_editais
  UNION ALL SELECT 'public.contratacoes_itens', count(*) FROM public.contratacoes_itens
  UNION ALL SELECT 'public.contratacoes_resultados', count(*) FROM public.contratacoes_resultados
  UNION ALL SELECT 'public.contratacoes_atas', count(*) FROM public.contratacoes_atas
  UNION ALL SELECT 'public.contratacoes_ata_participantes', count(*) FROM public.contratacoes_ata_participantes
  UNION ALL SELECT 'public.contratacoes_contratos', count(*) FROM public.contratacoes_contratos
  UNION ALL SELECT 'public.contratacoes_eventos', count(*) FROM public.contratacoes_eventos
  UNION ALL SELECT 'public.irp_intencoes', count(*) FROM public.irp_intencoes
  UNION ALL SELECT 'public.irp_itens', count(*) FROM public.irp_itens
  UNION ALL SELECT 'public.irp_participantes', count(*) FROM public.irp_participantes
  UNION ALL SELECT 'public.irp_eventos', count(*) FROM public.irp_eventos
  UNION ALL SELECT 'public.legislacao_fontes', count(*) FROM public.legislacao_fontes
  UNION ALL SELECT 'public.legislacao_documentos', count(*) FROM public.legislacao_documentos
  UNION ALL SELECT 'public.legislacao_versoes', count(*) FROM public.legislacao_versoes
  UNION ALL SELECT 'public.legislacao_relacoes', count(*) FROM public.legislacao_relacoes
  UNION ALL SELECT 'public.legislacao_alertas', count(*) FROM public.legislacao_alertas
  UNION ALL SELECT 'private.pncp_sync_run', count(*) FROM private.pncp_sync_run
  UNION ALL SELECT 'private.pncp_sync_request', count(*) FROM private.pncp_sync_request
  UNION ALL SELECT 'private.source_record', count(*) FROM private.source_record
  UNION ALL SELECT 'private.source_record_version', count(*) FROM private.source_record_version
  UNION ALL SELECT 'private.pncp_period_anchor', count(*) FROM private.pncp_period_anchor
  UNION ALL SELECT 'private.idempotency_key', count(*) FROM private.idempotency_key
  UNION ALL SELECT 'private.job_queue', count(*) FROM private.job_queue
),
nao_aplicado AS (
  SELECT 'public.catmat_itens (nao-aplicado)' AS tabela, NULL::bigint AS linhas
  UNION ALL SELECT 'public.precos_praticados_itens (nao-aplicado)', NULL
)
SELECT tabela, linhas,
  CASE
    WHEN tabela LIKE '%(nao-aplicado)' THEN 'nao-aplicado'
    WHEN linhas IS NULL THEN 'nao-aplicado'
    WHEN linhas = 0 THEN 'vazio'
    ELSE 'com_dado'
  END AS situacao
FROM counts
UNION ALL
SELECT tabela, linhas, 'nao-aplicado' FROM nao_aplicado
ORDER BY tabela;

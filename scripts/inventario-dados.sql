-- Fase 0 do catálogo de perguntas: contagem real de linhas por tabela.
--
-- Sem isto, o status de cada pergunta ("respondível" / "vazio") é chute — e foi exatamente
-- esse passo que o primeiro teste do assistente pulou.
--
-- Rode no SQL Editor do Supabase e cole a saída em docs/pncp/inventario-dados.md, com a data.
--
-- Cobre as 4 situações distintas de respondibilidade:
--   migration + dado      -> respondivel
--   migration, 0 linhas   -> vazio
--   só no banco (drift)   -> responde em prod, quebra em ambiente novo
--   só em supabase/sql/   -> nao-aplicado (a query abaixo devolve "AUSENTE")

-- 1. Contagem de todas as tabelas de public e private, sem enumerar nome a nome.
--    Usa a contagem exata via query dinâmica; em tabelas grandes troque por reltuples.
SELECT
  n.nspname                                        AS schema,
  c.relname                                        AS tabela,
  (xpath('/row/c/text()',
     query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname),
                  false, true, ''))
  )[1]::text::bigint                               AS linhas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname IN ('public', 'private')
ORDER BY linhas DESC, n.nspname, c.relname;

-- 2. Quais tabelas existem no banco mas NÃO em nenhuma migration (drift).
--    Compare a lista abaixo com `grep -rhoP "CREATE TABLE (IF NOT EXISTS )?\K(public|private)\.\w+" supabase/migrations/*.sql | sort -u`
--    Esperado hoje em drift: catmat_grupos, catmat_classes, catmat_pdms, catmat_pdm_unidades,
--    catmat_pdm_naturezas_despesa, catmat_item_caracteristicas, pca_item_pdm
SELECT c.relname AS tabela_no_banco
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname = 'public'
ORDER BY 1;

-- 3. Tabelas escritas em supabase/sql/ e nunca aplicadas — devem aparecer como AUSENTE.
SELECT t.tabela,
       to_regclass('public.' || t.tabela) IS NOT NULL AS existe
FROM (VALUES ('catmat_itens'), ('precos_praticados_itens')) AS t(tabela);

-- 4. O gate: a base está mesmo restrita a 78/7830?
SELECT classe_material_servico, count(*) AS itens
FROM public.pca_itens
GROUP BY 1
ORDER BY 2 DESC;

-- 5. Dimensões que nunca foram verificadas (pergunta ORG-02 do catálogo depende disto).
SELECT 'entidades' AS tabela, count(*) FROM public.entidades
UNION ALL SELECT 'orgaos',   count(*) FROM public.orgaos
UNION ALL SELECT 'unidades', count(*) FROM public.unidades;

-- 6. Estado de pca_alteracoes — confirma ou derruba os 4 defeitos do diagnóstico
--    (docs/pncp/teste-assistente-pca-alteracoes.md).
SELECT
  count(*)                                                          AS total,
  count(*) FILTER (WHERE pca_plano_id IS NULL)                      AS sem_plano_defeito_A,
  count(*) FILTER (WHERE pca_item_id IS NOT NULL)                   AS com_item_defeito_C,
  count(*) FILTER (WHERE tipo_operacao = 'update'
                     AND dados_novos IS NULL)                       AS update_sem_dados_defeito_B,
  count(*) FILTER (WHERE tipo_operacao IN ('inativacao','reativacao')) AS inativ_reativ_defeito_D,
  count(DISTINCT sync_run_id)                                       AS execucoes_distintas
FROM public.pca_alteracoes;

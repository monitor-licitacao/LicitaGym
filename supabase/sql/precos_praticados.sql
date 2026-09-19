-- =============================================================================
-- 03 - PESQUISA DE PREÇO - PREÇOS PRATICADOS  →  fonte da verdade única
-- =============================================================================
-- Funde os dois endpoints do módulo numa tabela só:
--   /modulo-pesquisa-preco/1_consultarMaterial          → o fato completo (com preço)
--   /modulo-pesquisa-preco/2_consultarMaterialDetalhe   → enriquecimento (objeto + descrição detalhada)
--
-- O 2 é subconjunto do 1 em campos, mas é a fonte confiável de
-- descricaoDetalhadaItem — no 1 ele costuma vir vazio.
--
-- Chave natural: (idCompra, idItemCompra). Confirmado na amostra real: a compra
-- 16021105900032024 aparece com idItemCompra 5858679 e 5858680.
--
-- Roda em supabase/sql/ e não em migrations/ pelo mesmo motivo de
-- catmat_item_completo.sql: depende de catmat_itens, que ainda não é migration.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tabela única
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.precos_praticados_itens (
  -- chave
  id_compra                        text    NOT NULL,
  id_item_compra                   bigint  NOT NULL,

  numero_item_compra               integer,
  codigo_item_catalogo             integer,          -- = catmat_itens.codigo_item

  -- compra
  data_compra                      date,
  forma                            text,
  modalidade                       integer,
  criterio_julgamento              text,
  objeto_compra                    text,
  data_hora_atualizacao_compra     timestamptz,

  -- item e preço
  quantidade                       numeric,
  preco_unitario                   numeric(18,4),
  percentual_maior_desconto        numeric,
  descricao_item                   text,
  descricao_detalhada_item         text,
  marca                            text,
  data_resultado                   date,
  data_hora_atualizacao_item       timestamptz,

  -- unidade de FORNECIMENTO (como foi comprado) — não confundir com a de medida
  sigla_unidade_fornecimento       text,
  nome_unidade_fornecimento        text,
  capacidade_unidade_fornecimento  numeric,
  -- unidade de MEDIDA (a grandeza da capacidade)
  sigla_unidade_medida             text,
  nome_unidade_medida              text,

  -- fornecedor
  ni_fornecedor                    text,
  nome_fornecedor                  text,

  -- UASG / órgão / geografia
  codigo_uasg                      text,
  nome_uasg                        text,
  codigo_orgao                     integer,
  nome_orgao                       text,
  estado                           text,
  codigo_municipio                 integer,
  municipio                        text,
  poder                            text,
  esfera                           text,
  data_hora_atualizacao_uasg       timestamptz,

  -- catálogo (o endpoint já devolve a classificação — ver nota 3)
  codigo_classe                    integer,
  nome_classe                      text,
  codigo_pdm                       text,
  nome_pdm                         text,

  id_compra_item                   text,
  data_atualizacao_fato            timestamptz,

  -- proveniência
  detalhe_sincronizado_em          timestamptz,
  payload_hash                     text,
  last_synced_at                   timestamptz,
  created_at                       timestamptz NOT NULL DEFAULT now(),
  updated_at                       timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (id_compra, id_item_compra)
);

CREATE INDEX IF NOT EXISTS precos_praticados_catalogo_idx
  ON public.precos_praticados_itens (codigo_item_catalogo);
CREATE INDEX IF NOT EXISTS precos_praticados_pdm_idx
  ON public.precos_praticados_itens (codigo_pdm);
CREATE INDEX IF NOT EXISTS precos_praticados_classe_idx
  ON public.precos_praticados_itens (codigo_classe);
CREATE INDEX IF NOT EXISTS precos_praticados_data_idx
  ON public.precos_praticados_itens (data_resultado DESC);
CREATE INDEX IF NOT EXISTS precos_praticados_fornecedor_idx
  ON public.precos_praticados_itens (ni_fornecedor);
-- itens ainda sem descrição detalhada = fila do endpoint 2
CREATE INDEX IF NOT EXISTS precos_praticados_sem_detalhe_idx
  ON public.precos_praticados_itens (codigo_item_catalogo)
  WHERE descricao_detalhada_item IS NULL;

ALTER TABLE public.precos_praticados_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS precos_praticados_itens_select ON public.precos_praticados_itens;
CREATE POLICY precos_praticados_itens_select ON public.precos_praticados_itens
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.precos_praticados_itens IS
  'Fonte da verdade do módulo 03 - PESQUISA DE PREÇO. Uma linha por '
  '(id_compra, id_item_compra), fundindo 1_consultarMaterial (fato + preço) e '
  '2_consultarMaterialDetalhe (objeto + descrição detalhada).';

COMMENT ON COLUMN public.precos_praticados_itens.id_compra IS
  'TEXT de propósito: valores como 98591905000892021 têm 17 dígitos e estouram '
  'Number.MAX_SAFE_INTEGER (9007199254740991). JSON.parse em JS/Deno já perde '
  'precisão se a API devolver o campo como número — ver nota 1 no fim do arquivo.';

COMMENT ON COLUMN public.precos_praticados_itens.ni_fornecedor IS
  'CNPJ na maioria dos casos, mas pode ser CPF de fornecedor pessoa física — '
  'PII. Ver nota 2 no fim do arquivo (política CLA-40).';


-- -----------------------------------------------------------------------------
-- 2. Merge do endpoint 1 — recebe o array `resultado` verbatim
-- -----------------------------------------------------------------------------
-- O mapeamento fica aqui, em um lugar só, e não espalhado no TypeScript.
CREATE OR REPLACE FUNCTION public.merge_precos_praticados(p_rows jsonb)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.precos_praticados_itens AS t (
    id_compra, id_item_compra, numero_item_compra, codigo_item_catalogo,
    data_compra, forma, modalidade, criterio_julgamento, objeto_compra,
    data_hora_atualizacao_compra,
    quantidade, preco_unitario, percentual_maior_desconto,
    descricao_item, descricao_detalhada_item, marca,
    data_resultado, data_hora_atualizacao_item,
    sigla_unidade_fornecimento, nome_unidade_fornecimento,
    capacidade_unidade_fornecimento, sigla_unidade_medida, nome_unidade_medida,
    ni_fornecedor, nome_fornecedor,
    codigo_uasg, nome_uasg, codigo_orgao, nome_orgao,
    estado, codigo_municipio, municipio, poder, esfera,
    data_hora_atualizacao_uasg,
    codigo_classe, nome_classe, codigo_pdm, nome_pdm,
    id_compra_item, data_atualizacao_fato, last_synced_at
  )
  SELECT
    r->>'idCompra',
    (r->>'idItemCompra')::bigint,
    nullif(r->>'numeroItemCompra','')::integer,
    nullif(r->>'codigoItemCatalogo','')::integer,
    nullif(r->>'dataCompra','')::date,
    nullif(r->>'forma',''),
    nullif(r->>'modalidade','')::integer,
    nullif(r->>'criterioJulgamento',''),
    nullif(r->>'objetoCompra',''),
    nullif(r->>'dataHoraAtualizacaoCompra','')::timestamptz,
    nullif(r->>'quantidade','')::numeric,
    nullif(r->>'precoUnitario','')::numeric,
    nullif(r->>'percentualMaiorDesconto','')::numeric,
    nullif(r->>'descricaoItem',''),
    nullif(r->>'descricaoDetalhadaItem',''),
    nullif(r->>'marca',''),
    nullif(r->>'dataResultado','')::date,
    nullif(r->>'dataHoraAtualizacaoItem','')::timestamptz,
    nullif(r->>'siglaUnidadeFornecimento',''),
    nullif(r->>'nomeUnidadeFornecimento',''),
    nullif(r->>'capacidadeUnidadeFornecimento','')::numeric,
    nullif(r->>'siglaUnidadeMedida',''),
    nullif(r->>'nomeUnidadeMedida',''),
    nullif(r->>'niFornecedor',''),
    nullif(r->>'nomeFornecedor',''),
    nullif(r->>'codigoUasg',''),
    nullif(r->>'nomeUasg',''),
    nullif(r->>'codigoOrgao','')::integer,
    nullif(r->>'nomeOrgao',''),
    nullif(r->>'estado',''),
    nullif(r->>'codigoMunicipio','')::integer,
    nullif(r->>'municipio',''),
    nullif(r->>'poder',''),
    nullif(r->>'esfera',''),
    nullif(r->>'dataHoraAtualizacaoUasg','')::timestamptz,
    nullif(r->>'codigoClasse','')::integer,
    nullif(r->>'nomeClasse',''),
    nullif(r->>'codigoPdm',''),
    nullif(r->>'nomePdm',''),
    nullif(r->>'idCompraItem',''),
    nullif(r->>'dataAtualizacaoFato','')::timestamptz,
    now()
  FROM jsonb_array_elements(p_rows) AS r
  WHERE r->>'idCompra' IS NOT NULL AND r->>'idItemCompra' IS NOT NULL
  ON CONFLICT (id_compra, id_item_compra) DO UPDATE SET
    numero_item_compra              = EXCLUDED.numero_item_compra,
    codigo_item_catalogo            = EXCLUDED.codigo_item_catalogo,
    data_compra                     = EXCLUDED.data_compra,
    forma                           = EXCLUDED.forma,
    modalidade                      = EXCLUDED.modalidade,
    criterio_julgamento             = EXCLUDED.criterio_julgamento,
    objeto_compra                   = COALESCE(EXCLUDED.objeto_compra, t.objeto_compra),
    data_hora_atualizacao_compra    = EXCLUDED.data_hora_atualizacao_compra,
    quantidade                      = EXCLUDED.quantidade,
    preco_unitario                  = EXCLUDED.preco_unitario,
    percentual_maior_desconto       = EXCLUDED.percentual_maior_desconto,
    descricao_item                  = EXCLUDED.descricao_item,
    -- nunca sobrescrever um detalhe bom com vazio (ver nota 4)
    descricao_detalhada_item        = COALESCE(EXCLUDED.descricao_detalhada_item,
                                               t.descricao_detalhada_item),
    marca                           = EXCLUDED.marca,
    data_resultado                  = EXCLUDED.data_resultado,
    data_hora_atualizacao_item      = EXCLUDED.data_hora_atualizacao_item,
    sigla_unidade_fornecimento      = EXCLUDED.sigla_unidade_fornecimento,
    nome_unidade_fornecimento       = EXCLUDED.nome_unidade_fornecimento,
    capacidade_unidade_fornecimento = EXCLUDED.capacidade_unidade_fornecimento,
    sigla_unidade_medida            = EXCLUDED.sigla_unidade_medida,
    nome_unidade_medida             = EXCLUDED.nome_unidade_medida,
    ni_fornecedor                   = EXCLUDED.ni_fornecedor,
    nome_fornecedor                 = EXCLUDED.nome_fornecedor,
    codigo_uasg                     = EXCLUDED.codigo_uasg,
    nome_uasg                       = EXCLUDED.nome_uasg,
    codigo_orgao                    = EXCLUDED.codigo_orgao,
    nome_orgao                      = EXCLUDED.nome_orgao,
    estado                          = EXCLUDED.estado,
    codigo_municipio                = EXCLUDED.codigo_municipio,
    municipio                       = EXCLUDED.municipio,
    poder                           = EXCLUDED.poder,
    esfera                          = EXCLUDED.esfera,
    data_hora_atualizacao_uasg      = EXCLUDED.data_hora_atualizacao_uasg,
    codigo_classe                   = EXCLUDED.codigo_classe,
    nome_classe                     = EXCLUDED.nome_classe,
    codigo_pdm                      = EXCLUDED.codigo_pdm,
    nome_pdm                        = EXCLUDED.nome_pdm,
    id_compra_item                  = EXCLUDED.id_compra_item,
    data_atualizacao_fato           = EXCLUDED.data_atualizacao_fato,
    last_synced_at                  = now(),
    updated_at                      = now()
  RETURNING 1;
$$;


-- -----------------------------------------------------------------------------
-- 3. Merge do endpoint 2 — só enriquece, nunca apaga
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_precos_praticados_detalhe(p_rows jsonb)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.precos_praticados_itens AS t (
    id_compra, id_item_compra, numero_item_compra, codigo_item_catalogo,
    objeto_compra, descricao_detalhada_item, data_atualizacao_fato,
    detalhe_sincronizado_em, last_synced_at
  )
  SELECT
    r->>'idCompra',
    (r->>'idItemCompra')::bigint,
    nullif(r->>'numeroItemCompra','')::integer,
    nullif(r->>'codigoItemCatalogo','')::integer,
    nullif(r->>'objetoCompra',''),
    nullif(r->>'descricaoDetalhadaItem',''),
    nullif(r->>'dataAtualizacaoFato','')::timestamptz,
    now(), now()
  FROM jsonb_array_elements(p_rows) AS r
  WHERE r->>'idCompra' IS NOT NULL AND r->>'idItemCompra' IS NOT NULL
  ON CONFLICT (id_compra, id_item_compra) DO UPDATE SET
    -- COALESCE + o NULLIF acima: "" do endpoint 2 não apaga o que já existe
    objeto_compra            = COALESCE(EXCLUDED.objeto_compra, t.objeto_compra),
    descricao_detalhada_item = COALESCE(EXCLUDED.descricao_detalhada_item,
                                        t.descricao_detalhada_item),
    codigo_item_catalogo     = COALESCE(t.codigo_item_catalogo,
                                        EXCLUDED.codigo_item_catalogo),
    data_atualizacao_fato    = COALESCE(EXCLUDED.data_atualizacao_fato,
                                        t.data_atualizacao_fato),
    detalhe_sincronizado_em  = now(),
    updated_at               = now()
  RETURNING 1;
$$;

REVOKE ALL ON FUNCTION public.merge_precos_praticados(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merge_precos_praticados_detalhe(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_precos_praticados(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.merge_precos_praticados_detalhe(jsonb) TO service_role;


-- -----------------------------------------------------------------------------
-- 4. Resumo estatístico por item CATMAT — a base da análise cruzada
-- -----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.precos_item_resumo;

CREATE MATERIALIZED VIEW public.precos_item_resumo AS
SELECT
  p.codigo_item_catalogo,
  max(p.descricao_item)                                   AS descricao_item,
  max(p.codigo_pdm)                                       AS codigo_pdm,
  max(p.nome_pdm)                                         AS nome_pdm,
  max(p.codigo_classe)                                    AS codigo_classe,

  count(*)                                                AS n_cotacoes,
  count(DISTINCT p.id_compra)                             AS n_compras,
  count(DISTINCT p.ni_fornecedor)                         AS n_fornecedores,
  count(DISTINCT p.codigo_uasg)                           AS n_uasgs,
  count(DISTINCT p.estado)                                AS n_ufs,

  min(p.preco_unitario)                                   AS preco_min,
  max(p.preco_unitario)                                   AS preco_max,
  avg(p.preco_unitario)::numeric(18,4)                    AS preco_medio,
  -- mediana e IQR: robustos a outlier, que em preço público é regra, não exceção
  percentile_cont(0.25) WITHIN GROUP (ORDER BY p.preco_unitario)::numeric(18,4) AS preco_p25,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY p.preco_unitario)::numeric(18,4) AS preco_mediana,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY p.preco_unitario)::numeric(18,4) AS preco_p75,

  min(p.data_resultado)                                   AS primeira_compra,
  max(p.data_resultado)                                   AS ultima_compra,
  -- recorte recente, para não misturar preço de 2021 com o de hoje
  percentile_cont(0.50) WITHIN GROUP (
    ORDER BY p.preco_unitario
  ) FILTER (WHERE p.data_resultado >= current_date - interval '365 days')::numeric(18,4)
                                                          AS preco_mediana_12m,
  count(*) FILTER (WHERE p.data_resultado >= current_date - interval '365 days')
                                                          AS n_cotacoes_12m,

  mode() WITHIN GROUP (ORDER BY p.sigla_unidade_fornecimento) AS unidade_fornecimento_predominante,
  count(DISTINCT p.sigla_unidade_fornecimento)            AS n_unidades_distintas,

  now()                                                   AS refreshed_at
FROM public.precos_praticados_itens p
WHERE p.codigo_item_catalogo IS NOT NULL
  AND p.preco_unitario IS NOT NULL
  AND p.preco_unitario > 0
GROUP BY p.codigo_item_catalogo;

CREATE UNIQUE INDEX precos_item_resumo_pk
  ON public.precos_item_resumo (codigo_item_catalogo);
CREATE INDEX precos_item_resumo_pdm_idx
  ON public.precos_item_resumo (codigo_pdm);

COMMENT ON MATERIALIZED VIEW public.precos_item_resumo IS
  'Estatística de preço praticado por item CATMAT. Use mediana e IQR, não '
  'min/max: erro de digitação e unidade trocada dominam os extremos. '
  'n_unidades_distintas > 1 é sinal de que os preços não são comparáveis.';

CREATE OR REPLACE FUNCTION public.refresh_precos_item_resumo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.precos_item_resumo;
EXCEPTION
  WHEN object_not_in_prerequisite_state THEN
    REFRESH MATERIALIZED VIEW public.precos_item_resumo;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_precos_item_resumo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_precos_item_resumo() TO service_role;

REVOKE ALL ON public.precos_item_resumo FROM anon;
GRANT SELECT ON public.precos_item_resumo TO authenticated;


-- -----------------------------------------------------------------------------
-- 5. A análise cruzada: planejado (PCA) x praticado
-- -----------------------------------------------------------------------------
-- codigo_item_catalogo é a MESMA chave de catmat_itens.codigo_item, então o
-- preço praticado conecta direto na cadeia CATMAT já montada.
CREATE OR REPLACE VIEW public.vw_pca_item_vs_preco_praticado AS
SELECT
  pi.id                              AS pca_item_id,
  pp.id                              AS pca_plano_id,
  pp.ano_exercicio,
  pp.orgao_cnpj,
  pi.numero_item,
  pi.descricao                       AS descricao_planejada,
  pi.quantidade,
  pi.unidade_medida                  AS unidade_planejada,
  pi.valor_unitario_estimado,

  ci.codigo_catmat,
  r.codigo_item_catalogo,
  r.nome_pdm,
  r.preco_mediana,
  r.preco_mediana_12m,
  r.preco_p25,
  r.preco_p75,
  r.n_cotacoes,
  r.n_cotacoes_12m,
  r.ultima_compra,
  r.unidade_fornecimento_predominante,

  -- quanto o estimado se afasta da mediana praticada
  CASE
    WHEN r.preco_mediana IS NULL OR r.preco_mediana = 0 THEN NULL
    ELSE round(
      (pi.valor_unitario_estimado - r.preco_mediana) / r.preco_mediana * 100, 2
    )
  END                                AS desvio_pct_vs_mediana,

  -- fora do intervalo interquartil = merece olhar humano
  CASE
    WHEN r.preco_p25 IS NULL OR pi.valor_unitario_estimado IS NULL THEN NULL
    ELSE pi.valor_unitario_estimado NOT BETWEEN r.preco_p25 AND r.preco_p75
  END                                AS fora_do_iqr,

  -- unidade planejada difere da praticada: comparação suspeita
  (pi.unidade_medida IS DISTINCT FROM r.unidade_fornecimento_predominante)
                                     AS unidade_divergente
FROM public.pca_itens pi
JOIN public.pca_planos pp ON pp.id = pi.pca_plano_id
LEFT JOIN public.catalogo_ponte cp
       ON cp.entidade_tipo = 'pca_item' AND cp.entidade_id = pi.id
LEFT JOIN public.catalogo_itens ci ON ci.id = cp.catalogo_item_id
LEFT JOIN public.precos_item_resumo r
       ON ci.codigo_catmat ~ '^[0-9]+$'
      AND r.codigo_item_catalogo = ci.codigo_catmat::integer;

COMMENT ON VIEW public.vw_pca_item_vs_preco_praticado IS
  'Planejado x praticado: item do PCA contra a estatística de preço do módulo '
  '03. Depende da ponte catalogo_ponte, que hoje cobre parte dos itens.';


-- =============================================================================
-- NOTAS
-- =============================================================================
--
-- 0. VALIDADO EM PostgreSQL 16.13.
--    Fixture com os DTOs oficiais + payloads reais do item 224811. Confirmado:
--    os dois arquivos aplicam do zero e são idempotentes; o merge do endpoint 1
--    NÃO apaga a descrição detalhada que o endpoint 2 trouxe (nas duas ordens);
--    e a estatística se comporta — com um outlier de R$ 250 (caixa de 10
--    lançada como unitário) entre 5 cotações, a média vai a 85,48 enquanto a
--    mediana fica em 45,00, e n_unidades_distintas = 2 denuncia a mistura.
--    Um item de PCA a R$ 95,00 saiu com desvio_pct_vs_mediana = 111,11 e
--    fora_do_iqr = true.
--
-- 1. PRECISÃO DE idCompra — CONFIRMADO PELO PRÓPRIO SWAGGER.
--    Os dois endpoints declaram TIPOS DIFERENTES para o mesmo campo:
--      FtPesqPrecoCompraMaterialDTO.idCompra          integer / int64
--      FtPesqPrecoCompraMaterialDetalheDTO.idCompra   string
--    Ou seja, o endpoint 1 devolve número cru e o 2 devolve string.
--    Na amostra: "98591905000892021" (17 dígitos) > Number.MAX_SAFE_INTEGER
--    (9007199254740991, 16 dígitos). O endpoint 2 devolve o campo entre aspas,
--    então JSON.parse preserva. O schema do endpoint 1 declara `integer` e o
--    exemplo mostra 0 sem aspas — se a API devolver número cru, JSON.parse em
--    Deno JÁ perde precisão antes de qualquer código nosso rodar, e o merge
--    grava uma chave errada em silêncio.
--    Mitigação no sync: ler o corpo como texto e, antes do JSON.parse, envelopar
--    os inteiros longos em aspas; ou usar um parser que suporte BigInt. Validar
--    com um caso conhecido de 17 dígitos.
--    Sem isso, o MESMO registro entra com id_compra diferente conforme o
--    endpoint que o trouxe, e o ON CONFLICT nunca casa: linha duplicada,
--    preço contado duas vezes na mediana.
--
-- 2. ni_fornecedor PODE SER CPF.
--    Fornecedor pessoa física entra com CPF nesse campo. docs/pncp/security-mvp.md
--    (CLA-40) decidiu não ingerir PII. Aqui a coluna é necessária para a análise,
--    então fica a decisão: (a) ingerir e restringir a coluna por policy/coluna
--    mascarada para authenticated, (b) gravar só quando tiver 14 dígitos (CNPJ) e
--    descartar o resto, (c) hashear o NI mantendo nome_fornecedor.
--    Nada disso está implementado — precisa de decisão de produto.
--
-- 3. codigoPdm E codigoClasse VÊM NO PAYLOAD DE PREÇO.
--    Isso torna 1_consultarMaterial uma SEGUNDA fonte para a aresta
--    item -> PDM que falta em catmat_itens (ver supabase/sql/catmat_item_completo.sql).
--    Bootstrap complementar:
--      INSERT INTO catmat_itens (codigo_item, codigo_pdm, descricao_item, origem)
--      SELECT DISTINCT ON (codigo_item_catalogo)
--             codigo_item_catalogo, codigo_pdm, descricao_item, 'bootstrap_preco'
--      FROM precos_praticados_itens
--      WHERE codigo_item_catalogo IS NOT NULL AND codigo_pdm IS NOT NULL
--      ORDER BY codigo_item_catalogo, data_atualizacao_fato DESC
--      ON CONFLICT (codigo_item) DO UPDATE
--        SET codigo_pdm = COALESCE(catmat_itens.codigo_pdm, EXCLUDED.codigo_pdm);
--    (exige o CHECK de `origem` aceitar 'bootstrap_preco')
--
-- 4. O ENDPOINT 2 DEVOLVE "" EM descricaoDetalhadaItem.
--    Na amostra real, 4 das 10 linhas vêm com string vazia. Por isso todo campo
--    passa por nullif(...,'') na entrada e COALESCE no update: uma segunda
--    sincronização não apaga a descrição boa que a primeira trouxe.
--
-- 5. MESMO ITEM, DESCRIÇÕES DIFERENTES.
--    O item 224811 aparece na amostra com descrição em CAIXA ALTA corrida e
--    também em formato "chave: valor" minúsculo. São a mesma coisa escrita de
--    dois jeitos — não deduplique por texto; a chave é codigo_item_catalogo.
--
-- 6. COMPARAR PREÇO ENTRE ANOS EXIGE DEFLAÇÃO.
--    preco_mediana cobre toda a série; preco_mediana_12m existe justamente para
--    evitar comparar 2021 com hoje. Índice de correção não está implementado.

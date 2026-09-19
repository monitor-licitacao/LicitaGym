-- CLA-40: Adicionar colunas de bridge para CATMAT e PNCP em pca_itens
-- Permite recuperar 113 PDMs perdidos via codigoPdm em VwFtPNCPCompraItemDTO
-- Vincula pca_itens → CATMAT (via codigo_pdm) e pca_itens → PNCP Consulta (via numero_controle_pncp)

ALTER TABLE public.pca_itens ADD COLUMN codigo_pdm text;
ALTER TABLE public.pca_itens ADD COLUMN codigo_item text;
ALTER TABLE public.pca_itens ADD COLUMN numero_controle_pncp text;
ALTER TABLE public.pca_itens ADD COLUMN numero_item_pncp text;
ALTER TABLE public.pca_itens ADD COLUMN classificacao_catalogo_id text;

-- Índices para joins frequentes
CREATE INDEX pca_itens_codigo_pdm_idx ON public.pca_itens (codigo_pdm);
CREATE INDEX pca_itens_numero_controle_pncp_idx ON public.pca_itens (numero_controle_pncp);

COMMENT ON COLUMN public.pca_itens.codigo_pdm IS 'Bridge CATMAT: código do PDM para classificação técnica';
COMMENT ON COLUMN public.pca_itens.codigo_item IS 'Código do item dentro do PDM para rastreabilidade';
COMMENT ON COLUMN public.pca_itens.numero_controle_pncp IS 'Bridge PNCP Consulta: numeroControlePncp para rastreabilidade de compra';
COMMENT ON COLUMN public.pca_itens.numero_item_pncp IS 'Sequencial do item em PNCP Consulta';
COMMENT ON COLUMN public.pca_itens.classificacao_catalogo_id IS 'Classificação de catálogo alternativa (fallback se classe_material_servico for genérica)';

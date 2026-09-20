-- A função pertence ao event trigger interno `ensure_rls` e não deve ser
-- exposta como RPC pela Data API. O event trigger continua executando-a como
-- proprietário; estes REVOKEs removem apenas chamadas diretas externas.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- As tabelas CATMAT/PCA criadas após a revisão RLS de 202609180009
-- herdaram grants para `anon`. As policies permitem leitura somente para
-- `authenticated`; remover os grants mantém a ACL alinhada ao modelo declarado.
REVOKE ALL PRIVILEGES ON TABLE
  public.catmat_grupos,
  public.catmat_classes,
  public.catmat_pdms,
  public.catmat_pdm_naturezas_despesa,
  public.catmat_pdm_unidades,
  public.catmat_item_caracteristicas,
  public.pca_item_pdm
FROM anon;

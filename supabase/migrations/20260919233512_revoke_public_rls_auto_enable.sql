-- A função pertence ao event trigger interno `ensure_rls` e não deve ser
-- exposta como RPC pela Data API. O event trigger continua executando-a como
-- proprietário; estes REVOKEs removem apenas chamadas diretas externas.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

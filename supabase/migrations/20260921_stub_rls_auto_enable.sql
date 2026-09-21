-- Stub function: rls_auto_enable
-- Criada para satisfazer REVOKE em 20260919233512_revoke_public_rls_auto_enable.sql
-- A função é parte de event trigger interno; este stub existe apenas para permitir
-- que REVOKEs sejam executados sem erro.

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Stub: sem operação. A função real é gerenciada pelo event trigger interno.
  NULL;
END;
$$;

COMMENT ON FUNCTION public.rls_auto_enable() IS 'Stub function for RLS auto-enable event trigger. Do not call directly.';

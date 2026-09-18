-- PostgREST no projeto remoto só expõe public/storage/graphql_public por padrão.
-- Edge Functions usam client.schema('private') — sem isso, probe/sync retorna 500.
-- Também: Dashboard → Settings → API → Exposed schemas → incluir "private".

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage, graphql_public, private';

GRANT USAGE ON SCHEMA private TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA private TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA private TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

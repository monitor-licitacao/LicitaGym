-- PostgREST no projeto remoto só expõe public/storage/graphql_public por padrão.
-- Edge Functions usam client.schema('private') — sem isso, probe/sync retorna 500.

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage, graphql_public, private';
NOTIFY pgrst, 'reload config';

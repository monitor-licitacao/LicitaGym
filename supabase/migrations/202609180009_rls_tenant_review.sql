-- CLA-40: Revisão RLS — leitura autenticada, escrita apenas service_role

-- Garantir que anon não lê metadados PNCP sem auth
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Políticas explícitas: sem INSERT/UPDATE/DELETE para authenticated em domínios PNCP
-- (sync escreve via service_role, que bypassa RLS)

COMMENT ON SCHEMA private IS
  'Camada de proveniência e sync — acesso exclusivo service_role (CLA-35/CLA-40)';

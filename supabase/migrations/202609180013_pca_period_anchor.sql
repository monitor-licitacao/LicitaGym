-- Lastro de período PCA (Search API pncp.gov.br/api/search — pcaorgao)

CREATE TABLE private.pncp_period_anchor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  scope_key text NOT NULL,
  ano_exercicio int NOT NULL,
  ultima_data_publicacao timestamptz,
  ultima_data_atualizacao timestamptz,
  total_indexado int,
  ultima_verificacao timestamptz NOT NULL DEFAULT now(),
  ultima_carga_completa timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_type, scope_key, ano_exercicio)
);

CREATE INDEX pncp_period_anchor_ano_idx
  ON private.pncp_period_anchor (ano_exercicio DESC);

COMMENT ON TABLE private.pncp_period_anchor IS
  'Checkpoint de período via Search API (data_publicacao_pncp / data_atualizacao_pncp). '
  'Evita re-sync pesado quando o índice não mudou desde a carga anual.';

GRANT ALL ON TABLE private.pncp_period_anchor TO service_role;

-- CLA-39: PCA normalizado

CREATE TABLE public.pca_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pca_pncp text NOT NULL UNIQUE,
  ano_exercicio int NOT NULL,
  orgao_cnpj text NOT NULL,
  unidade_codigo text,
  numero_plano int,
  titulo text,
  descricao text,
  status text,
  data_aprovacao date,
  data_publicacao date,
  data_atualizacao_origem timestamptz,
  url_origem text,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  last_seen_sync_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pca_planos_ano_idx ON public.pca_planos (ano_exercicio);
CREATE INDEX pca_planos_orgao_idx ON public.pca_planos (orgao_cnpj);
CREATE INDEX pca_planos_hash_idx ON public.pca_planos (payload_hash);

CREATE TABLE public.pca_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pca_plano_id uuid NOT NULL REFERENCES public.pca_planos(id) ON DELETE CASCADE,
  numero_item int NOT NULL,
  descricao text,
  categoria text,
  classe_material_servico text,
  quantidade numeric,
  unidade_medida text,
  valor_unitario_estimado numeric,
  valor_total_estimado numeric,
  data_prevista_contratacao date,
  prioridade text,
  status text,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  last_seen_sync_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pca_plano_id, numero_item)
);

CREATE INDEX pca_itens_plano_idx ON public.pca_itens (pca_plano_id);

CREATE TABLE public.pca_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pca_plano_id uuid REFERENCES public.pca_planos(id) ON DELETE CASCADE,
  pca_item_id uuid REFERENCES public.pca_itens(id) ON DELETE CASCADE,
  tipo_operacao text NOT NULL CHECK (tipo_operacao IN (
    'insert', 'update', 'inativacao', 'reativacao'
  )),
  dados_anteriores jsonb,
  dados_novos jsonb,
  payload_hash_anterior text,
  payload_hash_novo text,
  sync_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pca_planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pca_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pca_alteracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pca_planos_select ON public.pca_planos FOR SELECT TO authenticated USING (true);
CREATE POLICY pca_itens_select ON public.pca_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY pca_alteracoes_select ON public.pca_alteracoes FOR SELECT TO authenticated USING (true);

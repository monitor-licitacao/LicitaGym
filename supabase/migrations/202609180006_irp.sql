-- CLA-39 IRP: schema pronto; sync bloqueado até listagem consulta (gate CLA-34)

CREATE TABLE public.irp_intencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgao_cnpj text NOT NULL,
  ano int NOT NULL,
  sequencial int NOT NULL,
  numero_irp text,
  titulo text,
  objeto text,
  descricao text,
  orgao_id uuid REFERENCES public.orgaos(id),
  unidade_id uuid REFERENCES public.unidades(id),
  status text,
  data_abertura date,
  data_encerramento date,
  data_publicacao timestamptz,
  data_atualizacao_origem timestamptz,
  pca_plano_id uuid REFERENCES public.pca_planos(id),
  pca_codigo_pncp text,
  url_origem text,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  last_seen_sync_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  sync_habilitado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orgao_cnpj, ano, sequencial)
);

CREATE TABLE public.irp_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  irp_id uuid NOT NULL REFERENCES public.irp_intencoes(id) ON DELETE CASCADE,
  numero_item int NOT NULL,
  descricao text,
  codigo_material_servico text,
  categoria text,
  unidade_medida text,
  quantidade_estimada numeric,
  valor_unitario_estimado numeric,
  valor_total_estimado numeric,
  quantidade_minima numeric,
  quantidade_maxima numeric,
  data_prevista_contratacao date,
  status text,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (irp_id, numero_item)
);

CREATE TABLE public.irp_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  irp_id uuid NOT NULL REFERENCES public.irp_intencoes(id) ON DELETE CASCADE,
  entidade_id uuid REFERENCES public.entidades(id),
  orgao_cnpj text,
  codigo_unidade text,
  nome text,
  tipo_participacao text,
  quantidade_solicitada numeric,
  valor_estimado numeric,
  status text,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (irp_id, orgao_cnpj, codigo_unidade)
);

CREATE TABLE public.irp_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  irp_id uuid NOT NULL REFERENCES public.irp_intencoes(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL,
  descricao text,
  status_anterior text,
  status_novo text,
  data_evento timestamptz NOT NULL DEFAULT now(),
  origem text NOT NULL DEFAULT 'sync',
  payload jsonb,
  sync_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.irp_intencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irp_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irp_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irp_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY irp_intencoes_select ON public.irp_intencoes FOR SELECT TO authenticated USING (true);
CREATE POLICY irp_itens_select ON public.irp_itens FOR SELECT TO authenticated USING (true);

COMMENT ON COLUMN public.irp_intencoes.sync_habilitado IS
  'Gate CLA-34: permanece false até endpoint de listagem IRP na API consulta';

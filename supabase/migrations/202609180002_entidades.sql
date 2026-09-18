-- CLA-36: Dimensões compartilhadas órgão/unidade/fornecedor

CREATE TABLE public.entidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pncp text,
  cnpj text NOT NULL,
  cnpj_normalizado text GENERATED ALWAYS AS (regexp_replace(cnpj, '[^0-9]', '', 'g')) STORED,
  razao_social text,
  nome_fantasia text,
  tipo text NOT NULL CHECK (tipo IN ('orgao', 'entidade', 'unidade', 'fornecedor')),
  uf text,
  municipio_ibge text,
  municipio_nome text,
  payload_hash text,
  ativo boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CNPJ não é UNIQUE global: múltiplos papéis possíveis
CREATE INDEX entidades_cnpj_norm_idx ON public.entidades (cnpj_normalizado);
CREATE UNIQUE INDEX entidades_codigo_pncp_unique_idx
  ON public.entidades (codigo_pncp)
  WHERE codigo_pncp IS NOT NULL;

CREATE TABLE public.orgaos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_id uuid NOT NULL REFERENCES public.entidades(id),
  orgao_id_pncp bigint,
  cnpj text NOT NULL,
  razao_social text,
  esfera_id int,
  poder_id int,
  payload_hash text,
  ativo boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX orgaos_cnpj_idx ON public.orgaos (regexp_replace(cnpj, '[^0-9]', '', 'g'));

CREATE TABLE public.unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgao_id uuid NOT NULL REFERENCES public.orgaos(id),
  codigo_unidade text NOT NULL,
  nome text,
  uf text,
  municipio_ibge text,
  payload_hash text,
  ativo boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orgao_id, codigo_unidade)
);

ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgaos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY entidades_select_authenticated ON public.entidades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY orgaos_select_authenticated ON public.orgaos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY unidades_select_authenticated ON public.unidades
  FOR SELECT TO authenticated USING (true);

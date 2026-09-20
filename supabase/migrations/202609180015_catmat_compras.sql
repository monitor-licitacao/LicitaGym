-- CATMAT Compras.gov.br (Dados Abertos) — hierarquia material classe 7830

CREATE TABLE public.catmat_grupos (
  codigo_grupo int PRIMARY KEY,
  nome text NOT NULL,
  status boolean NOT NULL DEFAULT true,
  data_atualizacao_origem timestamptz,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.catmat_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_grupo int NOT NULL REFERENCES public.catmat_grupos(codigo_grupo) ON DELETE CASCADE,
  codigo_classe int NOT NULL,
  nome text NOT NULL,
  status boolean NOT NULL DEFAULT true,
  data_atualizacao_origem timestamptz,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (codigo_grupo, codigo_classe)
);

CREATE INDEX catmat_classes_grupo_idx ON public.catmat_classes (codigo_grupo);

CREATE TABLE public.catmat_pdms (
  codigo_pdm int PRIMARY KEY,
  codigo_grupo int NOT NULL,
  codigo_classe int NOT NULL,
  nome_pdm text NOT NULL,
  status boolean NOT NULL DEFAULT true,
  data_atualizacao_origem timestamptz,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  last_seen_sync_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catmat_pdms_classe_idx ON public.catmat_pdms (codigo_grupo, codigo_classe);

CREATE TABLE public.catmat_pdm_naturezas_despesa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pdm int NOT NULL REFERENCES public.catmat_pdms(codigo_pdm) ON DELETE CASCADE,
  codigo_natureza_despesa text NOT NULL,
  descricao text,
  status boolean NOT NULL DEFAULT true,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (codigo_pdm, codigo_natureza_despesa)
);

CREATE TABLE public.catmat_pdm_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pdm int NOT NULL REFERENCES public.catmat_pdms(codigo_pdm) ON DELETE CASCADE,
  sigla_unidade_fornecimento text NOT NULL,
  nome_unidade_fornecimento text,
  descricao_unidade_fornecimento text,
  numero_sequencial int NOT NULL DEFAULT 1,
  status boolean NOT NULL DEFAULT true,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (codigo_pdm, sigla_unidade_fornecimento, numero_sequencial)
);

CREATE TABLE public.catmat_item_caracteristicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_item int NOT NULL,
  codigo_caracteristica text NOT NULL,
  nome_caracteristica text NOT NULL,
  codigo_valor_caracteristica text NOT NULL,
  nome_valor_caracteristica text,
  numero_caracteristica int,
  sigla_unidade_medida text,
  status boolean NOT NULL DEFAULT true,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (codigo_item, codigo_caracteristica, codigo_valor_caracteristica)
);

CREATE INDEX catmat_item_caracteristicas_item_idx
  ON public.catmat_item_caracteristicas (codigo_item);

ALTER TABLE public.catmat_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catmat_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catmat_pdms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catmat_pdm_naturezas_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catmat_pdm_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catmat_item_caracteristicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY catmat_grupos_select ON public.catmat_grupos FOR SELECT TO authenticated USING (true);
CREATE POLICY catmat_classes_select ON public.catmat_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY catmat_pdms_select ON public.catmat_pdms FOR SELECT TO authenticated USING (true);
CREATE POLICY catmat_pdm_naturezas_select ON public.catmat_pdm_naturezas_despesa FOR SELECT TO authenticated USING (true);
CREATE POLICY catmat_pdm_unidades_select ON public.catmat_pdm_unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY catmat_item_caracteristicas_select ON public.catmat_item_caracteristicas FOR SELECT TO authenticated USING (true);

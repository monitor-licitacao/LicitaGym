-- CLA-37: Catálogo eletrônico e ponte CATMAT

CREATE TABLE public.catalogo_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pncp text,
  codigo_catmat text,
  codigo_catser text,
  descricao text NOT NULL,
  tipo text CHECK (tipo IN ('material', 'servico', 'outro')),
  unidade_medida text,
  ativo boolean NOT NULL DEFAULT true,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX catalogo_itens_codigo_pncp_idx
  ON public.catalogo_itens (codigo_pncp) WHERE codigo_pncp IS NOT NULL;

CREATE TABLE public.catalogo_especificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogo_item_id uuid NOT NULL REFERENCES public.catalogo_itens(id) ON DELETE CASCADE,
  versao int NOT NULL DEFAULT 1,
  titulo text,
  conteudo text,
  vigencia_inicio date,
  vigencia_fim date,
  fonte text NOT NULL DEFAULT 'pncp',
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalogo_item_id, versao)
);

CREATE TABLE public.catalogo_ponte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogo_item_id uuid NOT NULL REFERENCES public.catalogo_itens(id) ON DELETE CASCADE,
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('pca_item', 'irp_item', 'contratacao_item')),
  entidade_id uuid NOT NULL,
  tipo_correspondencia text NOT NULL DEFAULT 'incerta'
    CHECK (tipo_correspondencia IN ('exata', 'provavel', 'incerta')),
  evidencia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalogo_item_id, entidade_tipo, entidade_id)
);

CREATE TABLE public.categoria_item_pca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pncp int NOT NULL UNIQUE,
  descricao text NOT NULL,
  payload_hash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalogo_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_especificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria_item_pca ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalogo_itens_select ON public.catalogo_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY categoria_item_pca_select ON public.categoria_item_pca FOR SELECT TO authenticated USING (true);

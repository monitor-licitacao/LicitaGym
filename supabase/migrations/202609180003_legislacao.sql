-- CLA-38: Legislação versionada + Storage bucket privado

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'pncp-legislation',
      'pncp-legislation',
      false,
      52428800,
      ARRAY['application/pdf', 'text/html', 'application/octet-stream']
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO storage.buckets (id, name)
    VALUES ('pncp-legislation', 'pncp-legislation')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

CREATE TABLE public.legislacao_fontes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  url text NOT NULL UNIQUE,
  tipo_fonte text NOT NULL DEFAULT 'pagina_indice',
  ativo boolean NOT NULL DEFAULT true,
  frequencia_verificacao interval NOT NULL DEFAULT '6 hours',
  ultima_verificacao timestamptz,
  ultimo_hash_pagina text,
  etag_pagina text,
  last_modified_pagina timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.legislacao_fontes (nome, url, tipo_fonte)
VALUES (
  'Legislação PNCP',
  'https://www.gov.br/pncp/pt-br/pncp/legislacao',
  'pagina_indice'
)
ON CONFLICT (url) DO NOTHING;

CREATE TABLE public.legislacao_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_norma text,
  numero text,
  ano int,
  titulo text NOT NULL,
  ementa text,
  orgao_emissor text,
  data_publicacao date,
  data_vigencia_inicio date,
  data_vigencia_fim date,
  status text NOT NULL DEFAULT 'pendente_validacao'
    CHECK (status IN (
      'vigente', 'alterada', 'revogada', 'substituida',
      'pendente_validacao', 'erro_importacao'
    )),
  url_oficial text,
  url_canonica text NOT NULL,
  fonte_id uuid REFERENCES public.legislacao_fontes(id),
  ativo boolean NOT NULL DEFAULT true,
  versao_atual_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (url_canonica)
);

CREATE TABLE public.legislacao_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.legislacao_documentos(id) ON DELETE CASCADE,
  numero_versao int NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'pncp-legislation',
  storage_path text NOT NULL,
  nome_arquivo text,
  mime_type text,
  tamanho_bytes bigint,
  sha256 text NOT NULL,
  etag text,
  last_modified_origem timestamptz,
  conteudo_texto text,
  conteudo_hash text,
  data_identificacao timestamptz NOT NULL DEFAULT now(),
  data_download timestamptz,
  status text NOT NULL DEFAULT 'detectada'
    CHECK (status IN (
      'detectada', 'baixada', 'processada', 'vigente',
      'substituida', 'revogada', 'invalida', 'erro'
    )),
  is_current boolean NOT NULL DEFAULT false,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (documento_id, sha256)
);

ALTER TABLE public.legislacao_documentos
  ADD CONSTRAINT legislacao_documentos_versao_fk
  FOREIGN KEY (versao_atual_id) REFERENCES public.legislacao_versoes(id) ON DELETE SET NULL;

CREATE TABLE public.legislacao_relacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_origem_id uuid NOT NULL REFERENCES public.legislacao_documentos(id),
  documento_destino_id uuid NOT NULL REFERENCES public.legislacao_documentos(id),
  tipo_relacao text NOT NULL CHECK (tipo_relacao IN (
    'altera', 'revoga', 'revoga_parcialmente', 'regulamenta',
    'substitui', 'complementa', 'consolida', 'referencia'
  )),
  descricao text,
  confirmado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.legislacao_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid,
  documento_id uuid REFERENCES public.legislacao_documentos(id),
  tipo_alerta text NOT NULL,
  severidade text NOT NULL DEFAULT 'info',
  titulo text NOT NULL,
  mensagem text,
  lido boolean NOT NULL DEFAULT false,
  resolvido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.legislacao_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislacao_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislacao_fontes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislacao_relacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislacao_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY legislacao_documentos_select ON public.legislacao_documentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY legislacao_versoes_select ON public.legislacao_versoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY legislacao_fontes_select ON public.legislacao_fontes
  FOR SELECT TO authenticated USING (true);

-- Storage: leitura autenticada via signed URL; escrita só service_role
CREATE POLICY legislacao_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pncp-legislation');

CREATE POLICY legislacao_storage_service_write ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'pncp-legislation')
  WITH CHECK (bucket_id = 'pncp-legislation');

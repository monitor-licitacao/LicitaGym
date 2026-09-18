-- Contratações: editais, atas, contratos e ciclo unificado

CREATE TABLE public.contratacoes_editais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_controle_pncp text UNIQUE,
  orgao_cnpj text NOT NULL,
  ano int NOT NULL,
  sequencial int NOT NULL,
  numero_processo text,
  modalidade_codigo int,
  tipo_contratacao text,
  objeto text,
  descricao text,
  orgao_id uuid REFERENCES public.orgaos(id),
  unidade_id uuid REFERENCES public.unidades(id),
  pca_plano_id uuid REFERENCES public.pca_planos(id),
  valor_estimado numeric,
  data_publicacao timestamptz,
  data_abertura timestamptz,
  data_encerramento timestamptz,
  status text,
  url_origem text,
  payload_hash text NOT NULL,
  data_atualizacao_origem timestamptz,
  last_synced_at timestamptz,
  last_seen_sync_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orgao_cnpj, ano, sequencial)
);

CREATE TABLE public.contratacoes_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_origem text NOT NULL CHECK (tipo_origem IN ('edital', 'ata', 'contrato')),
  origem_id uuid NOT NULL,
  numero_item int NOT NULL,
  descricao text,
  codigo_material_servico text,
  categoria text,
  unidade_medida text,
  quantidade numeric,
  valor_unitario_estimado numeric,
  valor_unitario_homologado numeric,
  valor_total numeric,
  status text,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo_origem, origem_id, numero_item)
);

CREATE TABLE public.contratacoes_resultados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edital_id uuid NOT NULL REFERENCES public.contratacoes_editais(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.contratacoes_itens(id),
  fornecedor_id uuid REFERENCES public.entidades(id),
  classificacao int,
  situacao text,
  quantidade numeric,
  valor_unitario numeric,
  valor_total numeric,
  data_resultado timestamptz,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contratacoes_atas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_controle_pncp text UNIQUE,
  orgao_cnpj text NOT NULL,
  ano int NOT NULL,
  sequencial_ata int NOT NULL,
  edital_id uuid REFERENCES public.contratacoes_editais(id),
  processo_origem text,
  objeto text,
  valor_total numeric,
  data_assinatura date,
  data_publicacao timestamptz,
  vigencia_inicio date,
  vigencia_fim date,
  status text,
  url_origem text,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  last_seen_sync_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contratacoes_ata_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ata_id uuid NOT NULL REFERENCES public.contratacoes_atas(id) ON DELETE CASCADE,
  entidade_id uuid REFERENCES public.entidades(id),
  orgao_cnpj text,
  codigo_unidade text,
  tipo_participacao text,
  quantidade_aderida numeric,
  valor_aderido numeric,
  status text,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contratacoes_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_controle_pncp text UNIQUE,
  orgao_cnpj text NOT NULL,
  ano int NOT NULL,
  sequencial int NOT NULL,
  processo_origem text,
  edital_id uuid REFERENCES public.contratacoes_editais(id),
  ata_id uuid REFERENCES public.contratacoes_atas(id),
  fornecedor_id uuid REFERENCES public.entidades(id),
  objeto text,
  valor_inicial numeric,
  valor_atual numeric,
  data_assinatura date,
  vigencia_inicio date,
  vigencia_fim date,
  data_publicacao timestamptz,
  status text,
  url_origem text,
  payload_hash text NOT NULL,
  last_synced_at timestamptz,
  last_seen_sync_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orgao_cnpj, ano, sequencial)
);

CREATE TABLE public.contratacoes_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_entidade text NOT NULL,
  entidade_id uuid NOT NULL,
  tipo_evento text NOT NULL,
  status_anterior text,
  status_novo text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  data_evento timestamptz NOT NULL DEFAULT now(),
  origem text NOT NULL DEFAULT 'sync',
  sync_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contratacoes_editais_ano_idx ON public.contratacoes_editais (ano);
CREATE INDEX contratacoes_editais_status_idx ON public.contratacoes_editais (status);
CREATE INDEX contratacoes_contratos_ano_idx ON public.contratacoes_contratos (ano);

ALTER TABLE public.contratacoes_editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratacoes_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratacoes_resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratacoes_atas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratacoes_ata_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratacoes_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratacoes_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY contratacoes_editais_select ON public.contratacoes_editais FOR SELECT TO authenticated USING (true);
CREATE POLICY contratacoes_atas_select ON public.contratacoes_atas FOR SELECT TO authenticated USING (true);
CREATE POLICY contratacoes_contratos_select ON public.contratacoes_contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY contratacoes_eventos_select ON public.contratacoes_eventos FOR SELECT TO authenticated USING (true);

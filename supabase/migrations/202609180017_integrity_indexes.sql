-- Lacunas de integridade: chaves naturais, índices polimórficos, UNIQUE com NULL

-- 1. Atas: mesma chave natural que editais/contratos (orgao + ano + sequencial)
CREATE UNIQUE INDEX IF NOT EXISTS contratacoes_atas_natural_key_idx
  ON public.contratacoes_atas (orgao_cnpj, ano, sequencial_ata);

-- 2. Lookup inverso polimórfico (PCA/IRP/contratação → catálogo)
CREATE INDEX IF NOT EXISTS catalogo_ponte_entidade_idx
  ON public.catalogo_ponte (entidade_tipo, entidade_id);

-- 3. Timeline por entidade de contratação
CREATE INDEX IF NOT EXISTS contratacoes_eventos_entidade_idx
  ON public.contratacoes_eventos (tipo_entidade, entidade_id);

-- 4. IRP participantes: NULL não conflita no UNIQUE legado (PG < 15 semantics)
ALTER TABLE public.irp_participantes
  DROP CONSTRAINT IF EXISTS irp_participantes_irp_id_orgao_cnpj_codigo_unidade_key;

CREATE UNIQUE INDEX irp_participantes_irp_orgao_unidade_unique_idx
  ON public.irp_participantes (irp_id, orgao_cnpj, codigo_unidade)
  NULLS NOT DISTINCT;

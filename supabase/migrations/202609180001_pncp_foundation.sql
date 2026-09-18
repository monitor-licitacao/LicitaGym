-- CLA-35: Provenance, sync unificado, idempotência e fila de jobs

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- Sync runs (substitui *_sync_runs por recurso)
CREATE TABLE private.pncp_sync_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  modo text NOT NULL DEFAULT 'incremental'
    CHECK (modo IN ('incremental', 'completo', 'reprocessamento', 'manual')),
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN (
      'pendente', 'executando', 'concluida', 'concluida_com_erros',
      'falhou', 'cancelada'
    )),
  lock_key text,
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  pagina_atual int,
  pagina_final int,
  tamanho_pagina int,
  total_paginas int,
  total_recebidos int NOT NULL DEFAULT 0,
  total_novos int NOT NULL DEFAULT 0,
  total_atualizados int NOT NULL DEFAULT 0,
  total_inalterados int NOT NULL DEFAULT 0,
  total_erros int NOT NULL DEFAULT 0,
  erro_principal text,
  execution_id text,
  idempotency_key_id uuid,
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  finalizada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pncp_sync_run_resource_status_idx
  ON private.pncp_sync_run (resource_type, status);
CREATE INDEX pncp_sync_run_lock_key_idx
  ON private.pncp_sync_run (lock_key)
  WHERE status = 'executando';

-- HTTP request log por página/tentativa
CREATE TABLE private.pncp_sync_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid NOT NULL REFERENCES private.pncp_sync_run(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  pagina int,
  tentativa int NOT NULL DEFAULT 1,
  status_http int,
  tempo_resposta_ms int,
  resposta_hash text,
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pncp_sync_request_run_idx ON private.pncp_sync_request (sync_run_id);

-- Payload bruto importado
CREATE TABLE private.source_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid REFERENCES private.pncp_sync_run(id) ON DELETE SET NULL,
  resource_type text NOT NULL,
  endpoint text NOT NULL,
  request_hash text NOT NULL,
  content_hash text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint, request_hash, content_hash)
);

CREATE INDEX source_record_resource_idx ON private.source_record (resource_type);
CREATE INDEX source_record_content_hash_idx ON private.source_record (content_hash);

CREATE TABLE private.source_record_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES private.source_record(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_record_id, content_hash)
);

-- Idempotência de rotas de sync/API
CREATE TABLE private.idempotency_key (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  rota text NOT NULL,
  parametros_hash text NOT NULL,
  sync_run_id uuid REFERENCES private.pncp_sync_run(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'executando'
    CHECK (status IN ('executando', 'concluida', 'falhou')),
  resposta jsonb,
  http_status int,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (idempotency_key, rota)
);

CREATE INDEX idempotency_key_lookup_idx ON private.idempotency_key (idempotency_key, rota);

ALTER TABLE private.pncp_sync_run
  ADD CONSTRAINT pncp_sync_run_idempotency_fk
  FOREIGN KEY (idempotency_key_id) REFERENCES private.idempotency_key(id) ON DELETE SET NULL;

-- Fila de retry
CREATE TABLE private.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_queue_pending_idx
  ON private.job_queue (scheduled_for)
  WHERE status = 'pending';

-- Lock lógico via função
CREATE OR REPLACE FUNCTION private.try_acquire_sync_lock(
  p_lock_key text,
  p_resource_type text,
  p_parametros jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
DECLARE
  v_existing uuid;
  v_new_id uuid;
BEGIN
  SELECT id INTO v_existing
  FROM private.pncp_sync_run
  WHERE lock_key = p_lock_key AND status = 'executando'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO private.pncp_sync_run (resource_type, lock_key, parametros, status)
  VALUES (p_resource_type, p_lock_key, p_parametros, 'executando')
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA private FROM anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.try_acquire_sync_lock TO service_role;

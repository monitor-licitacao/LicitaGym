-- Endpoint 1: consultarGrupoMaterial
-- Grupos de Material (CATMAT Nível 1)
-- Golden rule: apenas grupos 72 e 78
-- Staging table para ingestão de dados oficiais antes de reconciliação com catmat_grupos

CREATE TABLE icatmat_grupo_material (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  nome_grupo VARCHAR(255) NOT NULL,
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL,
  payload_hash TEXT NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  CONSTRAINT unique_grupo UNIQUE(codigo_grupo),
  CONSTRAINT icatmat_grupo_material_payload_hash_key UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_grupo_sync ON icatmat_grupo_material(sync_timestamp);

-- RLS: habilitado. Políticas recomendadas:
-- - service_role: full access (sincronização)
-- - authenticated/anon: select-only se publicado
ALTER TABLE icatmat_grupo_material ENABLE ROW LEVEL SECURITY;

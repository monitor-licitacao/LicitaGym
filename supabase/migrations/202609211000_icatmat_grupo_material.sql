-- Endpoint 1: consultarGrupoMaterial
-- Grupos de Material (CATMAT Nível 1)
-- Golden rule: apenas grupos 72 e 78

CREATE TABLE icatmat_grupo_material (
  id BIGSERIAL PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  nome_grupo VARCHAR(255) NOT NULL,
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE,
  payload_hash VARCHAR(32),
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  CONSTRAINT unique_grupo UNIQUE(codigo_grupo),
  CONSTRAINT unique_payload_hash UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_grupo_codigo ON icatmat_grupo_material(codigo_grupo);
CREATE INDEX idx_icatmat_grupo_sync ON icatmat_grupo_material(sync_timestamp);

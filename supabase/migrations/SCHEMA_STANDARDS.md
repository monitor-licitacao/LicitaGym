# Padrão de Schema — Migrations CATMAT (E1-E7)

## Princípios

1. **Integridade relacional** — FKs cascata conectam tabelas hierarquicamente
2. **NOT NULL em críticos** — payload_hash, timestamp, status, códigos
3. **Segurança por padrão** — RLS habilitado em todas as staging tables
4. **Índices inteligentes** — apenas sync_timestamp (golden rule = 2 valores = índices em código_* inúteis)
5. **Modernidade** — IDENTITY ao invés de BIGSERIAL, TEXT ao invés de VARCHAR(32) para hash

## Hierarquia E1-E7

```
E1: icatmat_grupo_material (2 grupos: 72, 78)
  ↓ FK
E2: icatmat_classe_material (2 classes: 7220, 7830)
  ↓ FK
E3: icatmat_pdm_material (N PDMs por classe)
  ↓ FK
E4: icatmat_item_material (N items por PDM)
  ↓ FK(s)
E5: icatmat_natureza_despesa (1:N com items)
E6: icatmat_unidade_fornecimento (1:N com items — maior tabela)
E7: icatmat_caracteristica_material (1:N com items)
```

## Template Padrão

### Tabela Primária (E1-E4)

```sql
CREATE TABLE icatmat_XXXX (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_grupo INTEGER NOT NULL,
  [codigo_classe INTEGER NOT NULL,]
  [codigo_pdm INTEGER NOT NULL,]
  [codigo_item INTEGER NOT NULL,]
  [other fields...]
  data_hora_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL,
  payload_hash TEXT NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT check_grupos CHECK (codigo_grupo IN (72, 78)),
  [CONSTRAINT check_classes IF APPLICABLE...]
  CONSTRAINT fk_XXXX_PARENT
    FOREIGN KEY (codigo_grupo[, codigo_classe, ...])
    REFERENCES parent_table(codigo_grupo[, codigo_classe, ...])
    ON DELETE CASCADE,
  CONSTRAINT unique_XXXX UNIQUE(full_natural_key),
  CONSTRAINT unique_payload_hash UNIQUE(payload_hash)
);

CREATE INDEX idx_icatmat_XXXX_sync ON icatmat_XXXX(sync_timestamp);

ALTER TABLE icatmat_XXXX ENABLE ROW LEVEL SECURITY;
```

### Tabela Satélite (E5-E7)

Mesma estrutura, mas FK referencia E4 (item) usando chave composta.

```sql
CONSTRAINT fk_XXXX_item
  FOREIGN KEY (codigo_grupo, codigo_classe, codigo_item)
  REFERENCES icatmat_item_material(codigo_grupo, codigo_classe, codigo_item)
  ON DELETE CASCADE
```

## Checklist de Nova Migration

- [ ] IDENTITY ao invés de BIGSERIAL
- [ ] payload_hash TEXT (não VARCHAR)
- [ ] data_hora_atualizacao + sync_timestamp ambos NOT NULL
- [ ] status_* colunas com NOT NULL DEFAULT
- [ ] FK referencia tabela pai com ON DELETE CASCADE
  - **IMPORTANTE:** FK deve referenciar as mesmas colunas que compõem UNIQUE em tabela pai
  - Exemplos: E2 FK(codigo_grupo) → E1 UNIQUE(codigo_grupo); E5 FK(grupo,classe,pdm,item) → E4 UNIQUE(grupo,classe,pdm,item)
- [ ] CHECK constraints replicam golden rule (G72/7220 + G78/7830)
- [ ] UNIQUE em natural key composta
- [ ] UNIQUE em payload_hash com nome table-specific (ex: icatmat_classe_material_payload_hash_key)
- [ ] Índice apenas em sync_timestamp (não em código_*)
- [ ] RLS habilitado (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
- [ ] Comentário no início explicando FK referência
- [ ] Arquivo nomeado 202609211XXX_icatmat_XXXX.sql

## Observações

- **Índices em código_grupo/classe/item/etc:** Redundantes. Golden rule limita a 2 grupos, logo poucos registros por valor. Índice composto UNIQUE já cria B-tree eficiente.
- **payload_hash NOT NULL + UNIQUE:** Permite dedup sem requery. NULL viola UNIQUE, então cada "sem hash" é um registro distinct.
- **RLS desabilitado → sem proteção:** Staging tables podem ser acessadas por anon/authenticated. RLS habilitado bloqueia por padrão (aplique políticas conforme necessário).
- **Comentário de FK:** Indica qual é tabela pai para facilitar manutenção futura.

## Próximos Passos

1. Testar migrations em local stack (supabase db push)
2. Validar FKs (cascade delete behavior)
3. Aplicar RLS policies conforme necessário
4. Documentar reconciliação para catmat_* tabelas existentes

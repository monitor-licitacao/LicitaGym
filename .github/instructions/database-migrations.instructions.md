---
applyTo: "**/*.sql,supabase/migrations/**,supabase/seeds/**,supabase/sql/**"
---
# Banco de dados e migrations (Supabase/Postgres)

Documentação em Markdown descreve a arquitetura desejada — **não prova** o schema implantado. Confira migrations anteriores, constraints, índices, FKs, views, RPCs e consumidores (Edge Functions e Python).

## Revisar como [BLOQUEANTE]
- Tabela nova sem `ALTER TABLE … ENABLE ROW LEVEL SECURITY`.
- Policy permissiva demais (`USING (true)` para `anon`/`authenticated` em tabela com dado sensível) ou `GRANT` amplo a `anon`.
- Função `SECURITY DEFINER` sem `SET search_path` fixo.
- `ON CONFLICT (...)` cujo alvo não corresponde a UNIQUE/índice realmente existente.
- Secrets em migration ou seed.
- `NOT NULL` aplicado a campo que pode vir nulo da fonte oficial (ex.: `codigoValorCaracteristica` no E7). Nunca converter NULL em `0`, `''`, `'NULL'`, `'N/A'` para satisfazer chave.

## Alterações destrutivas — exigir justificativa no PR
`DROP TABLE`, `DROP COLUMN`, `ALTER TYPE`, `SET NOT NULL`, `DROP CONSTRAINT`, `ADD UNIQUE`, troca de PK. O PR deve explicar: dados existentes, consumidores, backfill, ordem de deploy e rollback/mitigação. Nunca assumir tabela vazia.

## Padrão staging CATMAT (`icatmat_*`, E1–E7)
- PK: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` (não `BIGSERIAL`).
- FKs hierárquicas E1 ← E2 ← E3 ← E4 ← E5/E6/E7.
- `payload_hash TEXT NOT NULL UNIQUE` para dedup — é versão de conteúdo, **não** identidade de negócio.
- `data_hora_atualizacao` e `sync_timestamp` `NOT NULL DEFAULT NOW()`.
- CHECKs do escopo: apenas G78/7830 (core) e G72/7220 (extensão).
- Ver `supabase/migrations/SCHEMA_STANDARDS.md`.

## Índices e FKs
- Índice novo deve estar ligado a uma query/join/filtro/conflict target concreto; avaliar custo de escrita.
- FK nova: verificar órfãos, ordem de ingestão, comportamento de DELETE e índice na coluna.

## Chaves
Identificadores governamentais ficam em colunas próprias, separados da surrogate key interna.

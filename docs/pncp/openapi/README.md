# Schemas do Dados Abertos Compras.gov.br

Versão: **2026-09-19** | Análise completa em [../catalogo-perguntas.md](../catalogo-perguntas.md)

## Conteúdo

- **schemas-inventory.md** — inventário dos 78 DTOs com contagens de campo e status de transcrição
- **dto-errors-2026-09-19.md** — erros críticos e transcrição encontrados na análise
- **schemas.json** — definiçõesJSON Schema (quando versionado)

## Propósito

Versionar o lastro da API Compras.gov.br para:

1. **Evitar perda de informação** — schemas hoje existem só no histórico de conversa
2. **Apoiar decisões de schema** — sem versionamento, toda mudança vira arqueologia
3. **Rastrear divergências** — quando a API muda, divergência com este repo é sinal de alarme
4. **Suportar manutenção de catálogo** — campos do DTO definem o que é respondível

## Estrutura

```
202609180004_pncp.sql        ← Migrations do banco
schemas-consultas.md          ← 8 DTOs mapeados campo→coluna Postgres
catalogo-perguntas.md         ← Perguntas respondíveis + seus bloqueios
openapi/README.md             ← Este arquivo
openapi/schemas-inventory.md  ← 78 DTOs: contagem, tipo, status
openapi/dto-errors.md         ← Erros críticos do esquema
```

## Como se mantém

### Quando a API muda

1. Comparar novo dump vs versão atual em `schemas-inventory.md`
2. Atualizar inventário
3. Verificar impacto em `catalogo-perguntas.md` — mudanças de campo podem reclassificar perguntas
4. Se novo DTO responde a pergunta do catálogo, validar no catálogo e catalogar em
   `schemas-consultas.md`

### Adição de DTO ao catálogo

1. Ler de `schemas-inventory.md`
2. Mapear campos na forma de `schemas-consultas.md` §1.x
3. Adicionar `(não persistido)` onde houver
4. Atualizar `catalogo-perguntas.md` para reclassificar perguntas bloqueadas por aquele DTO

## Nota sobre a análise 2026-09-19

Reviu todos os 78 DTOs em 8 blocos. Achados principais:

- **3 erros críticos estruturais** — AwardDTO nesting, ItemDTO type, ReleaseDTO contamination
- **Erros de transcrição** — campos renomeados (descricaoDetalhada), inconsistência de política
- **Gaps de dados** — normalizePcaItem descarta 12 campos críticos (pdmCodigo, codigoItem)
- **Reclassificações** — CONTR-01, ORG-01, ORG-02 respondíveis via DTOs já presentes

Ver [dto-errors-2026-09-19.md](./dto-errors-2026-09-19.md) para detalhes.

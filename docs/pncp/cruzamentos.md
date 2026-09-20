# Mapa de cruzamentos — domínios PNCP, CATMAT e catálogo

Complementa [contract-matrix.md](./contract-matrix.md): aquele documenta os **contratos de API**;
este documenta as **junções entre tabelas** e o que cada uma habilita.

Cada linha declara chave dos dois lados, cardinalidade e natureza da junção:

- **FK** — constraint declarada, conferida no DDL da migration citada
- **lógica** — junção válida sem constraint (polimórfica ou cross-schema por decisão de projeto)
- **candidata** — junção plausível ainda não materializada; exige normalização ou confirmação semântica

> **Status de verificação.** Blocos A–C e G foram conferidos linha a linha contra
> `supabase/migrations/*.sql` e contagens do banco remoto (mar/2026). O bloco D combina inventário
> empírico em [contract-matrix.md](./contract-matrix.md) (status `testado-*`, mar/2026) com
> semânticas ainda não `verified` contra Swagger — **não libera migration** além do que já está
> versionado (mesma regra do gate em `contract-matrix.md`).

---

## A. Junções com FK declarada

| origem | destino | cardinalidade | migration |
|--------|---------|---------------|-----------|
| `pca_itens.pca_plano_id` | `pca_planos.id` | N:1 (`ON DELETE CASCADE`) | `202609180004:31` |
| `pca_alteracoes.pca_plano_id` | `pca_planos.id` | N:1 | `202609180004:56` |
| `pca_alteracoes.pca_item_id` | `pca_itens.id` | N:1 | `202609180004:57` |
| `orgaos.entidade_id` | `entidades.id` | N:1 | `202609180002:29` |
| `unidades.orgao_id` | `orgaos.id` | N:1, `UNIQUE (orgao_id, codigo_unidade)` | `202609180002:46` |
| `contratacoes_editais.orgao_id` | `orgaos.id` | N:1 (nullable) | `202609180005:14` |
| `contratacoes_editais.unidade_id` | `unidades.id` | N:1 (nullable) | `202609180005:15` |
| `contratacoes_editais.pca_plano_id` | `pca_planos.id` | N:1 (nullable) | `202609180005:16` |
| `contratacoes_resultados.edital_id` | `contratacoes_editais.id` | N:1 **NOT NULL** | `202609180005:55` |
| `contratacoes_resultados.item_id` | `contratacoes_itens.id` | N:1 (nullable) | `202609180005:56` |
| `contratacoes_resultados.fornecedor_id` | `entidades.id` | N:1 (nullable) | `202609180005:57` |
| `contratacoes_atas.edital_id` | `contratacoes_editais.id` | N:1 (nullable) | `202609180005:75` |
| `contratacoes_ata_participantes.ata_id` | `contratacoes_atas.id` | N:1 (`CASCADE`) | `202609180005:95` |
| `contratacoes_contratos.edital_id` / `.ata_id` / `.fornecedor_id` | editais / atas / entidades | N:1 (nullable) | `202609180005:115-117` |
| `irp_itens.irp_id` / `irp_participantes.irp_id` / `irp_eventos.irp_id` | `irp_intencoes.id` | N:1 (`CASCADE`) | `202609180006` |
| `irp_intencoes.orgao_id` / `.unidade_id` / `.pca_plano_id` | orgaos / unidades / pca_planos | N:1 (nullable) | `202609180006:12,13,19` |
| `catalogo_especificacoes.catalogo_item_id` | `catalogo_itens.id` | N:1 (`CASCADE`) | `202609180007:23` |
| `catalogo_ponte.catalogo_item_id` | `catalogo_itens.id` | N:1 (`CASCADE`) | `202609180007:37` |
| `pca_item_pdm.pca_item_id` | `pca_itens.id` | N:1 (`CASCADE`) | `202609180016:23` |
| `pca_item_pdm.codigo_pdm` | `catmat_pdms.codigo_pdm` | N:1 (`CASCADE`) | `202609180016:24` |
| `catmat_classes.codigo_grupo` | `catmat_grupos.codigo_grupo` | N:1 (`CASCADE`) | `202609180015:16` |
| `catmat_pdms.(codigo_grupo, codigo_classe)` | `catmat_classes.(codigo_grupo, codigo_classe)` | N:1 | `202609180018` |
| `catmat_pdm_naturezas_despesa.codigo_pdm` | `catmat_pdms.codigo_pdm` | N:1 (`CASCADE`) | `202609180015:48` |
| `catmat_pdm_unidades.codigo_pdm` | `catmat_pdms.codigo_pdm` | N:1 (`CASCADE`) | `202609180015:61` |
| `private.pncp_sync_request.sync_run_id` | `private.pncp_sync_run.id` | N:1 (`CASCADE`) | `202609180001:46` |
| `private.source_record.sync_run_id` | `private.pncp_sync_run.id` | N:1 (`SET NULL`) | `202609180001:63` |
| `private.source_record_version.source_record_id` | `private.source_record.id` | N:1 (`CASCADE`) | `202609180001:79` |

## B. Junções lógicas (sem FK, por projeto)

| origem | destino | chave | por que não é FK |
|--------|---------|-------|------------------|
| `contratacoes_itens.origem_id` | editais / atas / contratos | `(tipo_origem, origem_id)` | polimórfica — `tipo_origem` discrimina o alvo |
| `contratacoes_eventos.entidade_id` | qualquer domínio de contratação | `(tipo_entidade, entidade_id)` | polimórfica |
| `catalogo_ponte.entidade_id` | `pca_itens` / `irp_itens` / `contratacoes_itens` | `(entidade_tipo, entidade_id)` | polimórfica — `CHECK` aceita os três tipos (`202609180007:38`) |
| `pca_alteracoes.sync_run_id`, `irp_eventos.sync_run_id`, `contratacoes_eventos.sync_run_id` | `private.pncp_sync_run.id` | `uuid` | cross-schema; mantido solto para não acoplar `public` a `private` |
| `pca_itens.codigo_classe_catmat` | `catmat_pdms.codigo_classe` | `integer` | classe ≠ PDM; join retorna **até 49 PDMs candidatos** por item (classe 7830) |
| `pca_itens.classe_material_servico` | `pca_itens.codigo_classe_catmat` | backfill numérico | redundância intencional — coluna explícita em `202609180016:3-15` |
| `catalogo_itens.codigo_catmat` | `catmat_item_caracteristicas.codigo_item` | `text` → `int` | catálogo LicitaGym ↔ características Compras.gov (endpoint 7) |
| `catalogo_itens.codigo_pdm` | `catmat_pdms.codigo_pdm` | `text` → `int` | denormalizado em `202609180012:6`; curadoria e sync Compras.gov |
| `catalogo_ponte` → `pca_item_pdm` | mesmo `pca_item_id` | via `catalogo_itens.codigo_pdm` | duas trilhas: match de **item** (ponte) e match de **PDM** (pdm + score) |

Toda junção polimórfica **exige o discriminador no `WHERE`**. Filtrar só por `entidade_id` pode
casar linhas de domínios diferentes, já que os UUIDs vêm de tabelas distintas.

**Anti-padrão confirmado:** `pca_itens.numero_item` é sequência **dentro do plano** (`UNIQUE (pca_plano_id, numero_item)`, `202609180004:49`). **Nunca** cruzar com `catmat_pdms.codigo_pdm`.

## C. Junções candidatas (não materializadas)

| origem | destino | o que falta |
|--------|---------|-------------|
| `pca_planos.orgao_cnpj` | `entidades.cnpj_normalizado` | `entidades` tem coluna `GENERATED` normalizada e índice (`202609180002:7,22`); o lado do PCA já entra normalizado por `normalizeCnpj` em `normalize.ts`. Junção direta, falta só declarar o uso. |
| `pca_planos.orgao_cnpj` | `orgaos.cnpj` | `orgaos` **não tem** coluna normalizada — só índice de expressão `UNIQUE` sobre `regexp_replace(cnpj, '[^0-9]', '', 'g')` (`202609180002:42`). Repetir a mesma expressão para usar o índice; comparar com `orgaos.cnpj` cru faz seq scan e erra quando há pontuação. |
| `pca_planos.unidade_codigo` | `unidades` | `codigo_unidade` **não é único global** — unicidade é `(orgao_id, codigo_unidade)`. Resolver o órgão primeiro; chave isolada produz falso positivo. |
| `categoria_item_pca.codigo_pncp` | item ou categoria de PCA | semântica não confirmada. `codigo_pncp` é `int UNIQUE` populado de `/categoriaItemPcas`; `pca_itens.categoria` guarda o **nome** (`categoriaItemPcaNome`). Confirmar se o payload traz também o código antes de FK. |
| `catmat_item_caracteristicas.codigo_item` | `catalogo_itens.codigo_catmat` | junção confirmada empiricamente (ver §D); FK formal pendente de gate `verified` |

## D. Cruzamentos habilitados pelo Dados Abertos Compras

**Inventário empírico.** Endpoints material 1–7 e demais módulos estão catalogados em
[contract-matrix.md](./contract-matrix.md) com status `testado-ok` / `testado-falha` / `testado-vazio`
(chamadas reais registradas, mar/2026). DTOs e SQL: [schemas-consultas.md](../compras-gov/schemas-consultas.md).
Testes decisivos pendentes de rodar localmente: [`scripts/probe-compras-api.ps1`](../../scripts/probe-compras-api.ps1).

**Escopo ainda `A VERIFICAR`:** módulos fora do CATMAT material já ingerido (PGC, pesquisa de preço),
contratos de parâmetro conflitantes e normalização dimensional de características — abaixo.

| cruzamento | uso pretendido |
|------------|----------------|
| PDM → unidades de fornecimento | validar/padronizar `pca_itens.unidade_medida` contra unidades permitidas do PDM |
| PDM → natureza de despesa | leitura orçamentária por item; endpoint 5 pode exigir `codigoPdm` — ver probe B1/B2 |
| **item** → características e valores | alimentar `catalogo_itens.taxonomias` — junção confirmada abaixo |

**Ambiguidade resolvida** (amostra de linha real, 2026-09-18).
`catmat_item_caracteristicas.codigo_item` é **código CATMAT de item**, não `codigo_pdm`:

```json
{"codigo_item": 287851, "codigo_caracteristica": "BHAY",
 "nome_caracteristica": "CARACTERÍSTICAS ADICIONAIS",
 "codigo_valor_caracteristica": "A55129", "nome_valor_caracteristica": "MALHA 12 X 12",
 "numero_caracteristica": 6, "sigla_unidade_medida": null}
```

Junção habilitada:

```text
catalogo_itens.codigo_catmat  →  catmat_item_caracteristicas.codigo_item
```

É a **fonte oficial de `catalogo_itens.taxonomias`**, hoje preenchida à mão ou via parser de descrição.

> **Risco de junção silenciosa.** `codigo_item` é `int`; `codigo_catmat` é `text` sem padding.
> `'0000000287851' <> '287851'` devolve zero linhas sem erro. Conferir antes de backfill.

### Normalizar `catmat_item_caracteristicas`

**Não cruzar `sigla_unidade_medida` com `catmat_pdm_unidades`.** Unidade de fornecimento (compra)
≠ unidade da característica (atributo técnico). O cruzamento falha em silêncio quando siglas coincidem
(ex.: `KG`).

Decomposição alvo (gate futuro):

```text
catmat_caracteristicas(codigo_caracteristica PK, nome_caracteristica, sigla_unidade_medida)
catmat_caracteristica_valores(codigo_valor_caracteristica PK, codigo_caracteristica FK, nome_valor)
catmat_item_caracteristica_valores(codigo_item, codigo_valor_caracteristica, numero_caracteristica)
```

Verificar dependência funcional antes de mover colunas — ver queries em PR #1 (`cruzamentos.md` histórico).

## E. Correções ao primeiro estudo

1. **Não é preciso criar `irp_item_pdm`.** `catalogo_ponte` já aceita `entidade_tipo IN ('pca_item', 'irp_item', 'contratacao_item')` (`202609180007:38`). Para IRP e itens de contratação, reutilizar a ponte existente; `pca_item_pdm` é específica do domínio PCA → PDM.
2. **`resultado → edital` é FK direta e obrigatória.** `contratacoes_resultados.edital_id` é `NOT NULL`; `item_id` é nullable. Agregar resultado por edital não depende de item.
3. **A coluna de payload é `payload`, não `conteudo`** (`private.source_record`, `202609180001:68`).
4. **O risco de RLS em `private` está superestimado.** `202609180001:4-5` revoga `USAGE` do schema para `PUBLIC`; `202609180001:159` revoga tabelas para `anon`/`authenticated`. Ligar RLS continua valendo como defesa em profundidade, mas não há porta aberta só por expor o schema no PostgREST (`202609180014`).
5. **`classe_material_servico = 7830` é classe CATMAT, não PDM.** Todos os 224 itens PCA ativos tinham esse valor; join por classe gera 49 PDMs candidatos — usar `pca_item_pdm` + `catalogo_ponte` para o PDM exato.
6. **Tabelas `catmat_*` e `pca_item_pdm` têm migration.** `202609180015`–`202609180018` — versionadas no repo e aplicadas no remoto mar/2026.

## F. Lacunas de integridade encontradas

| # | lacuna | impacto | ação sugerida |
|---|--------|---------|---------------|
| 1 | ~~`catmat_*` / `pca_item_pdm` só no banco~~ | **Resolvido** | `202609180015`, `202609180016` |
| 2 | ~~`contratacoes_atas` sem chave composta~~ | **Resolvido** | `202609180017` |
| 3 | ~~`catalogo_ponte` sem índice polimórfico~~ | **Resolvido** | `202609180017` |
| 4 | ~~`contratacoes_eventos` sem índice polimórfico~~ | **Resolvido** | `202609180017` |
| 5 | ~~`irp_participantes` UNIQUE com NULLs~~ | **Resolvido** | `202609180017`: `NULLS NOT DISTINCT` |
| 6 | ~~`catmat_pdms` sem FK para `catmat_classes`~~ | **Resolvido** | `202609180018` |
| 7 | Curadoria manual vs catálogo oficial | `fonte_curadoria='manual'` em subset do PDM 2640 (106 itens) | tratar filtros de curadoria como **SELECT** sobre `catalogo_itens` — não materializar como FK |

Consultas de curadoria (filtros manuais no catálogo CATMAT):

```sql
-- Itens com curadoria manual LicitaGym (fitness)
SELECT codigo_catmat, codigo_pdm, descricao, taxonomias, categoria_licitagym
FROM catalogo_itens
WHERE fonte_curadoria = 'manual'
  AND classe_catmat = '7830'
  AND ativo = true;

-- Classe 7220 (pisos) no catálogo, pendente de curadoria
SELECT codigo_catmat, codigo_pdm, descricao, categoria_licitagym
FROM catalogo_itens
WHERE classe_catmat = '7220'
  AND ativo = true
  AND categoria_licitagym IS NULL;

-- PCA com PDM confirmado vs candidato por classe
SELECT pi.numero_item, pi.descricao,
       pip.codigo_pdm, pip.confirmado, pip.score,
       cp.entidade_tipo IS NOT NULL AS tem_ponte_catalogo
FROM pca_itens pi
LEFT JOIN pca_item_pdm pip ON pip.pca_item_id = pi.id
LEFT JOIN catalogo_ponte cp
  ON cp.entidade_tipo = 'pca_item' AND cp.entidade_id = pi.id
WHERE pi.ativo = true
ORDER BY pi.pca_plano_id, pi.numero_item;
```

## G. PCA ↔ CATMAT ↔ catálogo LicitaGym — estado validado (2026-09-19)

Diagnóstico no banco remoto (`inventario_dados.sql` / MCP). Snapshot antigo (224 itens, 111 pontes) **substituído** após carga nacional escopo 7830.

| métrica | valor |
|---------|-------|
| `pca_itens` ativos (classe 7830) | 3.220 |
| `pca_item_pdm` vínculos | 227 (181 `confirmado=true` — ver PCA-09) |
| `catalogo_ponte` (total) | 222 |
| `catalogo_itens` ativos (classe 7830) | 594 |
| `catmat_pdms` ativos (classe 7830) | 49 |
| `catalogo_itens` / `catmat_pdms` classe 7220 | curadoria — sync `72/7220`; **não** entra no gate PCA |

**Perguntas de produto (catálogo assistente):** equivalência item LicitaGym = **PONTE-01/02/03**; PDM escolhido = **PCA-09**; candidatos por classe = **PCA-08**. Ver [catalogo-perguntas-assistente.md](./catalogo-perguntas-assistente.md).

**Modelo de cruzamento recomendado:**

```text
pca_planos
  └── pca_itens
        ├── codigo_classe_catmat → catmat_pdms.codigo_classe   (candidatos, até 49 — PCA-08)
        ├── codigo_item_origem → catalogo_itens.codigo_catmat   (exata PNCP — PONTE-01)
        ├── catalogo_ponte → catalogo_itens                    (Jaccard / curadoria — PONTE-01)
        └── pca_item_pdm → catmat_pdms.codigo_pdm              (PDM escolhido — PCA-09)
```

**Consulta — PDMs candidatos por classe (exploratório):**

```sql
SELECT pp.id_pca_pncp, pi.numero_item, pi.descricao,
       cp.codigo_pdm, cp.nome_pdm
FROM pca_planos pp
JOIN pca_itens pi ON pi.pca_plano_id = pp.id
JOIN catmat_pdms cp ON cp.codigo_classe = pi.codigo_classe_catmat
WHERE pi.ativo = true AND pp.ativo = true
ORDER BY pp.ano_exercicio DESC, pi.numero_item, cp.codigo_pdm;
```

**Consulta — plano + item + PDM vinculado:**

```sql
SELECT pp.id_pca_pncp, pp.ano_exercicio, pi.numero_item, pi.descricao,
       pip.codigo_pdm, pip.confirmado, pip.score, pip.tipo_correspondencia
FROM pca_planos pp
JOIN pca_itens pi ON pi.pca_plano_id = pp.id
LEFT JOIN pca_item_pdm pip ON pip.pca_item_id = pi.id
WHERE pp.ativo = true AND pi.ativo = true
ORDER BY pp.ano_exercicio DESC, pi.numero_item;
```

Mais exemplos SQL: [schemas-consultas.md](../compras-gov/schemas-consultas.md).

---

## Referências

- [contract-matrix.md](./contract-matrix.md) — contratos de API, inventário empírico Compras.gov, gate de migrations
- [architecture.md](./architecture.md) — sync, Edge Functions, cron
- [schemas-consultas.md](../compras-gov/schemas-consultas.md) — DTOs Compras.gov e SQL CATMAT
- [probe-compras-api.ps1](../../scripts/probe-compras-api.ps1) — testes decisivos PGC / natureza / preço

# Mapa de cruzamentos — domínios PNCP, CATMAT e catálogo

Complementa [contract-matrix.md](./contract-matrix.md): aquele documento registra os **contratos de API**;
este registra as **junções entre tabelas** e o que cada uma habilita.

Cada linha declara chave dos dois lados, cardinalidade e natureza da junção:

- **FK** — constraint declarada, conferida no DDL da migration citada
- **lógica** — junção válida sem constraint (polimórfica ou cross-schema por decisão de projeto)
- **candidata** — junção plausível ainda não materializada; exige normalização ou confirmação semântica

> **Status de verificação.** Blocos A–C e G foram conferidos linha a linha contra
> `supabase/migrations/*.sql` e contagens do banco remoto (mar/2026). O bloco D depende do
> Swagger do Dados Abertos Compras — está marcado `A VERIFICAR` e **não libera migration**
> enquanto não for confirmado (mesma regra do gate em `contract-matrix.md`).

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
| `pca_planos.orgao_cnpj` | `orgaos.cnpj` | `orgaos` **não tem** coluna normalizada — só índice de expressão `UNIQUE` sobre `regexp_replace(cnpj, '[^0-9]', '', 'g')` (`202609180002:42`). Repetir a mesma expressão para usar o índice. |
| `pca_planos.unidade_codigo` | `unidades` | `codigo_unidade` **não é único global** — unicidade é `(orgao_id, codigo_unidade)`. Resolver o órgão primeiro. |
| `categoria_item_pca.codigo_pncp` | item ou categoria de PCA | semântica não confirmada. `codigo_pncp` é `int UNIQUE` populado de `/categoriaItemPcas`; `pca_itens.categoria` guarda o **nome** (`categoriaItemPcaNome`). Confirmar se o payload traz também o código antes de FK. |
| `catmat_pdms.(codigo_grupo, codigo_classe)` | `catmat_classes` | colunas existem (`202609180015:32-33`) mas **sem FK** composta — integridade só por sync idempotente. |
| `catmat_item_caracteristicas.codigo_item` | `catalogo_itens.codigo_catmat` | plausível como FK após confirmar no Swagger que `codigo_item` do endpoint 7 é código CATMAT de item (não PDM). |

## D. Cruzamentos habilitados pelo Dados Abertos Compras — `A VERIFICAR`

Hipóteses de trabalho, nenhuma confirmada contra o Swagger no ambiente de escrita deste doc:

| cruzamento | uso pretendido |
|------------|----------------|
| PDM → unidades de fornecimento | validar/padronizar `pca_itens.unidade_medida` contra unidades permitidas do PDM |
| PDM → natureza de despesa | leitura orçamentária por item; hoje `catmat_pdm_naturezas_despesa` está vazia (API retorna zero para classe 7830) |
| PDM → características e valores | alimentar `catalogo_itens.taxonomias` (hoje curadoria manual + parser Compras.gov) |

**Ambiguidade aberta.** `catmat_item_caracteristicas.codigo_item` é `codigo_pdm` ou código CATMAT de
item? Na hierarquia CATMAT (grupo → classe → PDM → item), a característica pertence ao **item** e o
endpoint 7 exige `codigoItem`. Zero correspondência direta entre os 49 PDMs e linhas de
características é **consistente** com `codigo_item` ser código de item (`catalogo_itens.codigo_catmat`),
não de PDM. Confirmar no Swagger antes de declarar FK.

## E. Correções ao primeiro estudo

1. **Não é preciso criar `irp_item_pdm`.** `catalogo_ponte` já aceita `entidade_tipo IN ('pca_item', 'irp_item', 'contratacao_item')` (`202609180007:38`). Para IRP e itens de contratação, reutilizar a ponte existente; `pca_item_pdm` é específica do domínio PCA → PDM.
2. **`resultado → edital` é FK direta e obrigatória.** `contratacoes_resultados.edital_id` é `NOT NULL`; `item_id` é nullable. Agregar resultado por edital não depende de item.
3. **A coluna de payload é `payload`, não `conteudo`** (`private.source_record`, `202609180001:68`).
4. **O risco de RLS em `private` está superestimado.** `202609180001:4-5` revoga `USAGE` do schema para `PUBLIC`; `202609180001:159` revoga tabelas para `anon`/`authenticated`. Ligar RLS continua valendo como defesa em profundidade, mas não há porta aberta só por expor o schema no PostgREST (`202609180014`).
5. **`classe_material_servico = 7830` é classe CATMAT, não PDM.** Todos os 224 itens PCA ativos tinham esse valor; join por classe gera 49 PDMs candidatos — usar `pca_item_pdm` + `catalogo_ponte` para o PDM exato.
6. **Tabelas `catmat_*` e `pca_item_pdm` agora têm migration.** `202609180015_catmat_compras.sql` e `202609180016_pca_item_pdm.sql` — aplicadas no remoto mar/2026.

## F. Lacunas de integridade encontradas

| # | lacuna | impacto | ação sugerida |
|---|--------|---------|---------------|
| 1 | ~~`catmat_*` / `pca_item_pdm` só no banco~~ | **Resolvido** | migrations `015` e `016` |
| 2 | `contratacoes_atas` sem `UNIQUE (orgao_cnpj, ano, sequencial_ata)` | editais e contratos têm chave composta (`202609180005:30,133`); atas só têm `numero_controle_pncp` | migration de unicidade composta quando sync de atas estabilizar |
| 3 | `catalogo_ponte` sem índice em `(entidade_tipo, entidade_id)` | lookup inverso (PCA → catálogo) faz seq scan | índice composto |
| 4 | `contratacoes_eventos` sem índice em `(tipo_entidade, entidade_id)` | timeline por entidade lenta | índice composto |
| 5 | `irp_participantes` `UNIQUE (irp_id, orgao_cnpj, codigo_unidade)` com colunas nullable | em Postgres, `NULL` não conflita — duplicatas possíveis | `NOT NULL` ou índice parcial |
| 6 | `catmat_pdms` sem FK para `catmat_classes` | órfãos teóricos se sync falhar parcialmente | FK composta `(codigo_grupo, codigo_classe)` após gate D |
| 7 | Curadoria manual vs catálogo oficial | `fonte_curadoria='manual'` em subset do PDM 2640 (106 itens) | tratar filtros de curadoria como **SELECT** sobre `catalogo_itens` (`taxonomias`, `categoria_licitagym`, `grupo_licitagym` em JSON) — não materializar como FK |

Consultas de curadoria (filtros manuais no catálogo CATMAT):

```sql
-- Itens com curadoria manual LicitaGym (fitness)
SELECT codigo_catmat, codigo_pdm, descricao, taxonomias, categoria_licitagym
FROM catalogo_itens
WHERE fonte_curadoria = 'manual'
  AND classe_catmat = '7830'
  AND ativo = true;

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

## G. PCA ↔ CATMAT — estado validado (mar/2026)

Diagnóstico no banco remoto após sync Compras.gov + `link-catmat-pca`:

| métrica | valor |
|---------|-------|
| `pca_itens` ativos (classe 7830) | 224 |
| `codigo_classe_catmat` preenchido | 224/224 |
| `catmat_pdms` ativos (classe 7830) | 49 |
| `catalogo_itens` ativos (classe 7830) | 594 |
| `catalogo_ponte` novos (1ª execução link) | 111 |
| `pca_item_pdm` vínculos | 111 (17 PDMs distintos; 65 `confirmado=true`) |

**Modelo de cruzamento recomendado:**

```text
pca_planos
  └── pca_itens
        ├── codigo_classe_catmat → catmat_pdms.codigo_classe   (candidatos, até 49)
        ├── catalogo_ponte → catalogo_itens                    (match descrição)
        └── pca_item_pdm → catmat_pdms.codigo_pdm              (PDM escolhido/candidato)
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

- [contract-matrix.md](./contract-matrix.md) — contratos de API e gate de migrations
- [architecture.md](./architecture.md) — sync, Edge Functions, cron
- [schemas-consultas.md](../compras-gov/schemas-consultas.md) — DTOs Compras.gov e SQL CATMAT

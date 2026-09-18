# Mapa de cruzamentos — domínios PNCP, CATMAT e catálogo

Complementa [contract-matrix.md](./contract-matrix.md): aquele documenta os **contratos de API**;
este documenta as **junções entre tabelas** e o que cada uma habilita.

Cada linha declara chave dos dois lados, cardinalidade e natureza da junção:

- **FK** — constraint declarada, conferida no DDL da migration citada
- **lógica** — junção válida sem constraint (polimórfica ou cross-schema por decisão de projeto)
- **candidata** — junção plausível ainda não materializada; exige normalização ou confirmação semântica

> **Status de verificação.** Blocos A–C foram conferidos linha a linha contra
> `supabase/migrations/*.sql`. O bloco D depende do Swagger do Dados Abertos Compras, que estava
> inacessível quando este documento foi escrito — está marcado `A VERIFICAR` e **não libera
> migration** enquanto não for confirmado (mesma regra do gate em `contract-matrix.md`).

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
| `private.pncp_sync_request.sync_run_id` | `private.pncp_sync_run.id` | N:1 (`CASCADE`) | `202609180001:46` |
| `private.source_record.sync_run_id` | `private.pncp_sync_run.id` | N:1 (`SET NULL`) | `202609180001:63` |
| `private.source_record_version.source_record_id` | `private.source_record.id` | N:1 (`CASCADE`) | `202609180001:79` |

## B. Junções lógicas (sem FK, por projeto)

| origem | destino | chave | por que não é FK |
|--------|---------|-------|------------------|
| `contratacoes_itens.origem_id` | editais / atas / contratos | `(tipo_origem, origem_id)` | polimórfica — `tipo_origem` discrimina o alvo |
| `contratacoes_eventos.entidade_id` | qualquer domínio de contratação | `(tipo_entidade, entidade_id)` | polimórfica |
| `catalogo_ponte.entidade_id` | `pca_itens` / `irp_itens` / `contratacoes_itens` | `(entidade_tipo, entidade_id)` | polimórfica — `CHECK` aceita os três tipos |
| `pca_alteracoes.sync_run_id`, `irp_eventos.sync_run_id`, `contratacoes_eventos.sync_run_id` | `private.pncp_sync_run.id` | `uuid` | cross-schema; mantido solto para não acoplar `public` a `private` |

Toda junção polimórfica **exige o discriminador no `WHERE`**. Filtrar só por `entidade_id` pode
casar linhas de domínios diferentes, já que os UUIDs vêm de tabelas distintas.

## C. Junções candidatas (não materializadas)

| origem | destino | o que falta |
|--------|---------|-------------|
| `pca_planos.orgao_cnpj` | `entidades.cnpj_normalizado` | `entidades` tem coluna `GENERATED` normalizada e índice (`202609180002:7,22`); o lado do PCA já entra normalizado por `normalizeCnpj` em `normalize.ts`. Junção direta, falta só declarar o uso. |
| `pca_planos.orgao_cnpj` | `orgaos.cnpj` | `orgaos` **não tem** coluna normalizada — só um índice de expressão `UNIQUE` sobre `regexp_replace(cnpj, '[^0-9]', '', 'g')` (`202609180002:42`). A junção precisa repetir a mesma expressão para usar o índice; comparar com `orgaos.cnpj` cru faz seq scan e erra quando há pontuação. |
| `pca_planos.unidade_codigo` | `unidades` | `codigo_unidade` **não é único global** — a unicidade é `(orgao_id, codigo_unidade)`. Resolver o órgão primeiro; chave isolada produz falso positivo. |
| `categoria_item_pca.codigo_pncp` | item ou categoria de PCA | semântica não confirmada. `codigo_pncp` é `int UNIQUE` e é populado de `/categoriaItemPcas` por `sync-pncp-catalogo`, enquanto `pca_itens.categoria` guarda o **nome** (`categoriaItemPcaNome`). Falta confirmar se o payload traz também o código. Não criar FK antes disso. |

## D. Cruzamentos habilitados pelo Dados Abertos Compras — `A VERIFICAR`

Hipóteses de trabalho, nenhuma confirmada contra o Swagger:

| cruzamento | uso pretendido |
|------------|----------------|
| PDM → unidades de fornecimento | validar/padronizar `pca_itens.unidade_medida` contra as unidades permitidas do PDM |
| PDM → natureza de despesa | leitura orçamentária por item; hoje `catmat_pdm_naturezas_despesa` está vazia |
| **item** → características e valores | alimentar `catalogo_itens.taxonomias`, hoje preenchida à mão — ver abaixo, junção confirmada |

**Ambiguidade resolvida** (por amostra de linha real, 2026-09-18).
`catmat_item_caracteristicas.codigo_item` é **código CATMAT de item**, não `codigo_pdm`:

```json
{"codigo_item": 287851, "codigo_caracteristica": "BHAY",
 "nome_caracteristica": "CARACTERÍSTICAS ADICIONAIS",
 "codigo_valor_caracteristica": "A55129", "nome_valor_caracteristica": "MALHA 12 X 12",
 "numero_caracteristica": 6, "sigla_unidade_medida": null}
```

Cada linha é uma tripla **(item, característica, valor)** — a atribuição de um valor de
característica a um item. Isso explica a "zero correspondência" que o primeiro estudo encontrou ao
comparar essa tabela com os 49 PDMs: o lado certo da junção é o item, não o PDM.

Junção que isso habilita:

```text
catalogo_itens.codigo_catmat  →  catmat_item_caracteristicas.codigo_item
```

É a **fonte oficial de `catalogo_itens.taxonomias`**, hoje preenchida à mão
(`{"MATERIAL": "AÇO CARBONO"}` é exatamente `nome_caracteristica → nome_valor_caracteristica`).

> **Risco de junção silenciosa.** `codigo_item` é `int` (`287851`); `codigo_catmat` é `text`,
> gravado por `import-catmat-curadoria` com `String(...).trim()` e sem padding. Se o export do app
> HTML tiver zerado à esquerda, `'0000000287851' <> '287851'` e a junção devolve zero linhas sem
> erro. Conferir `select codigo_catmat, length(codigo_catmat) from catalogo_itens limit 5;` antes
> de escrever o backfill.

### Normalizar `catmat_item_caracteristicas`

**Não cruzar `sigla_unidade_medida` com `catmat_pdm_unidades`.** São duas grandezas diferentes:

| coluna | o que é | exemplos |
|--------|---------|----------|
| `catmat_pdm_unidades` | unidade de **fornecimento** — como o item é comprado | `UN`, `CX`, `PC`, `KG` |
| `catmat_item_caracteristicas.sigla_unidade_medida` | unidade da **característica** — dimensão de um atributo técnico | `MM`, `KG`, `W`, `V` |

O cruzamento é perigoso justamente porque **falha em silêncio**: `KG` e `L` existem nos dois
domínios, então a junção casa em parte das linhas e produz resultado plausível e errado. Na linha
acima o campo é `null` porque "CARACTERÍSTICAS ADICIONAIS" com valor "MALHA 12 X 12" é descritiva,
não dimensional — esperar `null` na maioria das características textuais.

A tabela é uma tripla desnormalizada: repete `nome_caracteristica` em toda linha de todo item que
tenha aquela característica, e `nome_valor_caracteristica` em toda linha que use aquele valor. A
decomposição correta é em duas dimensões e um fato:

```text
catmat_caracteristicas(codigo_caracteristica PK, nome_caracteristica, sigla_unidade_medida)
catmat_caracteristica_valores(codigo_valor_caracteristica PK, codigo_caracteristica FK, nome_valor)
catmat_item_caracteristica_valores(codigo_item, codigo_valor_caracteristica, numero_caracteristica)
```

`sigla_unidade_medida` sobe para a dimensão da característica — **é essa a normalização de unidade
que a tabela pede**. `numero_caracteristica` (a ordem do atributo na ficha do item) fica no fato.

Verificar a dependência funcional antes de mover a coluna:

```sql
-- zero linhas => a unidade depende só da característica, pode subir para a dimensão
select codigo_caracteristica, nome_caracteristica,
       array_agg(distinct sigla_unidade_medida) as unidades
from catmat_item_caracteristicas
group by 1, 2
having count(distinct sigla_unidade_medida) > 1;

-- idem para o nome do valor
select codigo_valor_caracteristica, array_agg(distinct nome_valor_caracteristica)
from catmat_item_caracteristicas
group by 1
having count(distinct nome_valor_caracteristica) > 1;
```

## E. Correções ao primeiro estudo

1. **Não é preciso criar `irp_item_pdm`.** O estudo recomendou uma ponte nova espelhando
   `pca_item_pdm`. `catalogo_ponte` já aceita `entidade_tipo IN ('pca_item', 'irp_item',
   'contratacao_item')` (`202609180007:38`) — a ponte para IRP e para itens de contratação já existe.
2. **`resultado → edital` é FK direta e obrigatória.** O estudo mapeou o resultado só via `item_id`.
   `contratacoes_resultados.edital_id` é `NOT NULL`; `item_id` é nullable. Agregar resultado por
   edital não depende de item.
3. **A coluna de payload é `payload`, não `conteudo`** (`private.source_record`, `202609180001:68`).
4. **O risco de RLS em `private` está superestimado.** `202609180001:4-5` faz
   `REVOKE ALL ON SCHEMA private FROM PUBLIC` e concede `USAGE` apenas a `postgres` e
   `service_role` — `anon` e `authenticated` não alcançam essas tabelas mesmo com o schema exposto
   no PostgREST por `202609180014`. Ligar RLS ali continua valendo como defesa em profundidade e
   para silenciar o advisor, mas não há porta aberta.
5. **As tabelas `catmat_*` e `pca_item_pdm` não existem em migration.** Estão apenas no banco.
   Ver "Lacunas de integridade", item 1.

## F. Lacunas de integridade encontradas

1. **Drift de schema (bloqueante).** `catmat_grupos`, `catmat_classes`, `catmat_pdms`,
   `catmat_pdm_unidades`, `catmat_pdm_naturezas_despesa`, `catmat_item_caracteristicas`,
   `pca_item_pdm` e `pca_itens.codigo_classe_catmat` não constam de nenhuma migration. Ambiente novo
   ou `db reset` perde a camada CATMAT inteira.
2. **`contratacoes_atas` não tem a chave natural composta.** `contratacoes_editais` e
   `contratacoes_contratos` têm `UNIQUE (orgao_cnpj, ano, sequencial)`; atas têm as três colunas
   (`orgao_cnpj`, `ano`, `sequencial_ata`) mas só `numero_controle_pncp UNIQUE`. Ata que chegue sem
   número de controle duplica silenciosamente.
3. **Junções polimórficas sem índice.** `contratacoes_eventos (tipo_entidade, entidade_id)` e
   `catalogo_ponte (entidade_tipo, entidade_id)` não têm índice nessas colunas — buscar o histórico
   de um edital ou a ponte de um item faz varredura completa. `contratacoes_itens` está coberta pelo
   `UNIQUE (tipo_origem, origem_id, numero_item)`.
4. **`irp_participantes` tem `UNIQUE (irp_id, orgao_cnpj, codigo_unidade)` com colunas nulas**
   (`202609180006:67`). Em Postgres, `NULL` não conflita com `NULL`: participante sem CNPJ ou sem
   unidade pode entrar duplicado.

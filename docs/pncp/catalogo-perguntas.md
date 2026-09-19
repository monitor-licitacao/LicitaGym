# Catálogo de perguntas — assistente LicitaGym

> Status: **v0**. As perguntas, os caminhos de join, o gate e as armadilhas estão definidos.
> A coluna **status é presumida** — vira fato quando `scripts/inventario-dados.sql` (Fase 0)
> for executado e o resultado gravado em `docs/pncp/inventario-dados.md`.
> Enquanto isso: serve para discussão e roadmap, **não serve como eval**.

Método e fases em [plano-catalogo-perguntas.md](./plano-catalogo-perguntas.md).
Caminhos de join em [cruzamentos.md](./cruzamentos.md).

## Como ler

Cada linha é um contrato, não uma sugestão. A coluna **armadilha** é a mais importante: descreve
a resposta errada que *parece* certa — foi assim que o primeiro teste do assistente falhou
(ver [teste-assistente-pca-alteracoes.md](./teste-assistente-pca-alteracoes.md)).

**Estados de respondibilidade:**

| estado | significado | o assistente deve |
|---|---|---|
| `respondivel` | tabela em migration e com dado | responder com número |
| `drift` | existe no banco, em nenhuma migration | responder, **avisando** que quebra em ambiente novo |
| `vazio` | tabela existe, zero linhas | recusar, nomeando a tabela vazia |
| `nao-aplicado` | SQL em `supabase/sql/`, nunca rodado | recusar, nomeando o arquivo |
| `defeito` | dado existe mas está errado ou incompleto | recusar, nomeando o defeito |

**O gate 78/7830** não é uniforme. Em `pca_planos` não há coluna de classe — o filtro só existe
via `EXISTS` em `pca_itens.classe_material_servico`. Em preço, o eixo é `codigo_item_catalogo`.
Em órgão/unidade não há gate: a dimensão é neutra e filtra-se pelo fato.

---

## PCA — planejamento

| id | pergunta | tabelas e chaves | gate | status |
|---|---|---|---|---|
| PCA-01 | Quais órgãos planejaram material de academia em 2026, e quanto no total? | `pca_planos` ⋈ `pca_itens` por `pca_plano_id` | `EXISTS` em itens | `respondivel` |
| PCA-02 | Quais os itens mais planejados, por quantidade e por valor? | `pca_itens` | direto por classe | `respondivel` |
| PCA-03 | Qual a data prevista de contratação dos itens, e o que vence nos próximos 90 dias? | `pca_itens.data_prevista_contratacao` | direto | `respondivel` |
| PCA-04 | Quais itens ainda não têm PDM identificado? | `pca_itens` ⋈ `pca_item_pdm` | direto | `drift` |
| PCA-05 | Quantas alterações houve em cada plano? | `pca_planos` ⋈ `pca_alteracoes` por `pca_plano_id` | via itens | `defeito` |
| PCA-06 | Quais planos foram inativados? | `pca_alteracoes.tipo_operacao` | — | `defeito` |
| PCA-07 | **Por que** este item do PCA mudou? | `pca_alteracoes.dados_anteriores/novos` | — | `defeito` |

**Armadilhas**

- **PCA-01** — somar `valor_total_estimado` dos itens **e** um total do plano dá dupla contagem;
  o plano não tem valor próprio, é a soma dos itens.
- **PCA-04** — "sem PDM" tem dois sentidos: sem linha em `pca_item_pdm`, ou com linha não
  confirmada. São 113 e 46 na última contagem conhecida — dizer só "113" esconde metade.
- **PCA-05** — joinar só por `pca_plano_id` devolve **apenas alterações de item**: as de plano
  saem com `pca_plano_id` nulo (defeito A). Contar as órfãs à parte, ou o número sai errado
  para menos.
- **PCA-06** — `inativacao` e `reativacao` nunca são gravadas (defeito D). Responder "zero
  inativações" é falso: o certo é dizer que o evento não é registrado.
- **PCA-07** — responder com o `tipo_operacao` ("foi um update") é tautologia. O campo que
  explicaria (`dados_anteriores`/`dados_novos`) fica nulo no update (defeito B). **Não há
  resposta possível hoje.**

## CATMAT — catálogo e classificação

| id | pergunta | tabelas e chaves | gate | status |
|---|---|---|---|---|
| CAT-01 | A que PDM pertence este item, e em que classe e grupo? | `catmat_itens` → `catmat_pdms` → `catmat_classes` → `catmat_grupos` | inerente | `nao-aplicado` |
| CAT-02 | Quais unidades de fornecimento valem para este PDM? | `catmat_pdm_unidades` por `codigo_pdm` | inerente | `drift` |
| CAT-03 | Quais as características técnicas deste item? | `catmat_item_caracteristicas` por `codigo_item` | inerente | `drift` |
| CAT-04 | A unidade declarada no PCA é válida para o PDM do item? | `pca_itens.unidade_medida` × `catmat_pdm_unidades` | via item | `drift` |
| CAT-05 | Qual a natureza de despesa deste item? | `catmat_pdm_naturezas_despesa` | inerente | `vazio` |

**Armadilhas**

- **CAT-02 e CAT-04** — há **duas** "unidades" no CATMAT e elas não se falam: unidade de
  **fornecimento** (`UN`, `CX`, `PC` — como se compra) e unidade da **característica**
  (`MM`, `W`, `V` — grandeza de atributo). Cruzar as duas falha em silêncio porque `KG` e `L`
  existem nos dois domínios.
- **CAT-03** — `catmat_item_caracteristicas.codigo_item` é código de **item**, não de PDM.
  Comparar com `codigo_pdm` devolve zero linhas e parece "não há características".
- **CAT-05** — a carga registrou 22 linhas marcadas "COMPLETO" para 20.433 PDMs; provável
  filtro na origem. Antes de responder, confirmar com
  [`probe-compras-api.ps1`](../../scripts/probe-compras-api.ps1).

## Preço praticado

| id | pergunta | tabelas e chaves | gate | status |
|---|---|---|---|---|
| PRECO-01 | Quanto se pagou por este item nos últimos 12 meses? | `precos_praticados_itens` → `precos_item_resumo` | `codigo_item_catalogo` | `nao-aplicado` |
| PRECO-02 | Quem são os fornecedores recorrentes deste item, e em que UF? | `precos_praticados_itens` | idem | `nao-aplicado` |
| PRECO-03 | O valor estimado no PCA está acima do praticado? | `vw_pca_item_vs_preco_praticado` | ambos | `nao-aplicado` |

**Armadilhas**

- **PRECO-01** — responder com média. Um único lote lançado como unitário desloca a média em
  ordens de grandeza; a estatística honesta é **mediana e IQR**. Com 5 cotações e um outlier de
  R$ 250, a média foi a 85,48 e a mediana ficou em 45,00.
- **PRECO-02** — `niFornecedor` pode ser **CPF** de pessoa física. Decisão CLA-40 pendente:
  não expor sem definição.
- **PRECO-03** — comparar preços de anos diferentes sem deflacionar. E conferir
  `unidade_divergente`: preço por caixa contra preço por unidade não é comparação.

## Órgão, unidade e geografia

| id | pergunta | tabelas e chaves | gate | status |
|---|---|---|---|---|
| ORG-01 | Qual o nome e a esfera do órgão deste plano? | `pca_planos.orgao_cnpj` → `orgaos` / `entidades` | sem gate | **a confirmar** |
| ORG-02 | Em que UF está concentrada a demanda? | via `unidades`/`entidades` | sem gate | **a confirmar** |

**Armadilhas**

- **ORG-01** — `orgaos` **não tem** coluna de CNPJ normalizado, só um índice de expressão sobre
  `regexp_replace(cnpj, '[^0-9]', '', 'g')`. Comparar com `orgaos.cnpj` cru faz seq scan e erra
  quando há pontuação. `entidades` tem `cnpj_normalizado` como coluna gerada — preferir essa.
- **ORG-02** — `codigo_unidade` **não é único global**: a unicidade é `(orgao_id, codigo_unidade)`.
  Resolver o órgão antes.
- Ambas marcadas "a confirmar" porque o estado de `orgaos`, `unidades` e `entidades` nunca foi
  verificado. A Fase 0 fecha isso.

## Domínios sem carga

Uma linha por domínio, não uma por pergunta — inchar o catálogo com perguntas que ninguém pode
responder não ajuda.

| id | domínio | pergunta representativa | status | trava |
|---|---|---|---|---|
| CONTR-01 | Contratações | Quais editais saíram de um PCA de academia? Quem venceu e por quanto? | `vazio` | `contratacoes_*` sem carga |
| IRP-01 | IRP | Há intenção de registro de preços aberta para material de academia? | `vazio` | sem listagem pública; gate CLA-34 |
| LEG-01 | Legislação | Que norma rege esta modalidade? | `vazio` | tabelas isoladas, sem ponte com contratação |

## Proveniência (uso interno)

| id | pergunta | tabelas e chaves | status |
|---|---|---|---|
| PROV-01 | Quando foi a última carga, e o que ela trouxe? | `private.pncp_sync_run` | `respondivel` |
| PROV-02 | Qual o payload original desta linha? | `private.source_record` por `resource_type` | `respondivel` |

**Armadilha** — `private` não é alcançável por `anon`/`authenticated`: a migration 001 revoga
`USAGE` do schema. Só `service_role` lê. Perguntas de proveniência não podem ser respondidas em
rota de usuário final.

---

## Próximo passo

Rodar `scripts/inventario-dados.sql` e gravar o resultado em `docs/pncp/inventario-dados.md`.
Cada `status` presumido acima vira fato ou é corrigido — e as duas linhas "a confirmar" ganham
resposta. Só então o catálogo pode virar eval.

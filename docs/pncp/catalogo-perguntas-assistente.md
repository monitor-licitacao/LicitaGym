# Catálogo de perguntas — assistente LicitaGym

**Versão:** 2026-09-20  
**Inventário base:** [inventario-dados.md](./inventario-dados.md)  
**Junções:** [cruzamentos.md](./cruzamentos.md)  
**SQL canônico:** [supabase/sql/catalogo_perguntas.sql](../../supabase/sql/catalogo_perguntas.sql)  
**Eval bloqueado (caso real):** [relatorio_analise_pca_alteracoes.md](../relatorio_analise_pca_alteracoes.md)

---

## O que este documento é

Cada linha é um **contrato**: pergunta do usuário, caminho de dados, gate de escopo, estado de respondibilidade, consulta canônica (se existir) e **armadilha** — o jeito errado que parece certo.

Quatro estados (+ um subestado de eval):

| Estado | Significado |
|--------|-------------|
| **respondivel** | Tabela versionada **e** com linha no inventário |
| **vazio** | Migration ok, `count(*) = 0` |
| **drift** | Responde em prod, **quebra** em `db reset` / ambiente novo |
| **nao-aplicado** | SQL em `supabase/sql/`, tabela **não existe** no banco |
| **bloqueado-por-defeito** | Há dado, mas pipeline impede a resposta pedida (eval: **recusar** nomeando o defeito) |

---

## Gate 78 / 7830 (parâmetro `classe_gate`)

| Domínio | Como entra o gate |
|---------|-------------------|
| PCA / plano | `EXISTS (SELECT 1 FROM pca_itens i WHERE i.pca_plano_id = p.id AND i.classe_material_servico = :classe_gate)` — plano **não** tem coluna de classe |
| CATMAT / catálogo | `classe_catmat = :classe_gate` ou `catmat_pdms.codigo_classe = 7830` |
| Catálogo 7220 (piso, curadoria) | `classe_catmat = '7220'` — **não** entra no `classe_gate` 7830 nem no PCA |
| Preço praticado | `codigo_item_catalogo` → futuro `catmat_itens` (nao-aplicado) |
| Órgão / UF | **Sem gate de classe** — dimensão neutra; hoje `orgaos`/`unidades` vazios |
| Contratação / IRP | Gate indireto via FK nullable a `pca_planos` (domínios vazios) |
| Ponte PCA ↔ catálogo | `catalogo_ponte.entidade_tipo = 'pca_item'` + `entidade_id = pca_itens.id`; alternativa **exata** via `pca_itens.codigo_item_origem = catalogo_itens.codigo_catmat` (PNCP) |

Parâmetro de produto: `PNCP_PCA_CLASSIFICACOES` em `_shared/pncp/licitagym-catmat.ts`. Gate **implícito** quebra em silêncio se a variável mudar — toda consulta canônica usa `params AS (SELECT '7830'::text AS classe_gate)`.

---

## Catálogo

### PCA — Plano de Contratações

| id | pergunta | domínio | tabelas e chaves | gate | status | consulta | armadilha |
|----|----------|---------|------------------|------|--------|----------|-----------|
| PCA-01 | Quais órgãos planejaram material de academia em 2026 e quanto? | PCA | `pca_planos` ⋈ `pca_itens` ON `pca_plano_id`; agregação por `orgao_cnpj` | EXISTS 7830 + `ano_exercicio` | **respondivel** | `catalogo_perguntas.sql` PCA-01 | Usar tabela `orgaos` (0 linhas) em vez de `orgao_cnpj` do PCA |
| PCA-02 | Quantos planos de PCA existem no recorte? | PCA | `pca_planos` + EXISTS itens | EXISTS 7830 | **respondivel** (475) | PCA-02 | Contar `pca_planos` sem EXISTS — inclui plano sem item 7830 |
| PCA-03 | Quantos itens ativos no PCA classe academia? | PCA | `pca_itens.classe_material_servico` | `= classe_gate` | **respondivel** (3.220) | PCA-03 | Assumir “224 itens” de snapshot antigo |
| PCA-04 | Quais itens do PCA ainda não têm PDM identificado? | PCA | `pca_itens` LEFT JOIN `pca_item_pdm` | EXISTS 7830 | **respondivel** (2.993 sem vínculo) | PCA-04 | Confundir `numero_item` com `codigo_pdm` |
| PCA-05 | Quantas alterações foram feitas no PCA? | PCA | `pca_alteracoes` ⋈ `pca_planos` | EXISTS 7830 + linha órfãs | **respondivel** (3.792 total; 513 órfãs) | PCA-05 | Join só em `pca_plano_id` — esconde 513 alterações de plano |
| PCA-06 | Quais planos têm mais alterações? | PCA | idem PCA-05 | EXISTS 7830 | **respondivel** | PCA-06 | `ORDER BY created_at DESC LIMIT 10` — timestamp de sync, não negócio |
| PCA-07 | Por que este item do PCA mudou? (diff campo a campo) | PCA | `pca_alteracoes.dados_anteriores` / `dados_novos` por `pca_item_id` | item 7830 | **bloqueado-por-defeito** (histórico) | PCA-07 | Repetir `tipo_operacao` como “motivo”; inventar diff |
| PCA-07b | O que o sync registrou sobre alterações deste item? | PCA / proveniência | `pca_alteracoes` (`tipo_operacao`, `sync_run_id`, hashes) | item 7830 | **respondivel** (metadados) | PCA-07b | Confundir com PCA-07 — metadados ≠ motivo de negócio |
| PCA-08 | Quais PDMs são candidatos para um item? | PCA↔CATMAT | `pca_itens.codigo_classe_catmat` → `catmat_pdms` (N:49) | classe 7830 | **respondivel** | PCA-08 | Tratar candidatos como PDM escolhido |
| PCA-09 | Qual PDM está vinculado a este item? | PCA↔CATMAT | `pca_item_pdm` → `catmat_pdms` | via item 7830 | **respondivel** (181 confirmados) | PCA-09 | Usar `catalogo_ponte` no lugar de `pca_item_pdm` — pergunta errada; ver **PONTE-01** |

### Ponte PCA ↔ catálogo LicitaGym

| id | pergunta | domínio | tabelas e chaves | gate | status | consulta | armadilha |
|----|----------|---------|------------------|------|--------|----------|-----------|
| PONTE-01 | Qual item do catálogo LicitaGym corresponde a este item de PCA? | PCA↔Catálogo | `catalogo_ponte` (`entidade_tipo='pca_item'`) → `catalogo_itens`; ou `codigo_item_origem` → `codigo_catmat` | item 7830 | **respondivel** (parcial; ~222 pontes) | PONTE-01 | Responder PDM (`pca_item_pdm`) quando usuário pediu **item** LicitaGym |
| PONTE-02 | Quais itens PCA ainda não têm equivalência no catálogo LicitaGym? | PCA↔Catálogo | `pca_itens` anti-join `catalogo_ponte`; considerar `codigo_item_origem` | classe 7830 | **respondivel** | PONTE-02 | Assumir ponte Jaccard = CATMAT oficial sem checar `tipo_correspondencia` / `evidencia` |
| PONTE-03 | Com que confiança é a equivalência PCA↔catálogo? | PCA↔Catálogo | `catalogo_ponte.tipo_correspondencia`, `evidencia` (`pncp:codigoItem` vs `jaccard=…`) | item 7830 | **respondivel** | PONTE-03 | Tratar `provavel`/`incerta` como match exato |

> **Separação de papéis:** **PONTE-*** = item curado LicitaGym (`catalogo_itens`). **PCA-09** = PDM escolhido (`pca_item_pdm`). **PCA-08** = universo de PDMs por classe. Três perguntas distintas.

### CATMAT / Catálogo

| id | pergunta | domínio | tabelas e chaves | gate | status | consulta | armadilha |
|----|----------|---------|------------------|------|--------|----------|-----------|
| CAT-01 | Quais PDMs existem na classe academia? | CATMAT | `catmat_pdms` | `codigo_classe = 7830` | **respondivel** (49) | CAT-01 | — |
| CAT-02 | Quais unidades de fornecimento valem para este PDM? | CATMAT | `catmat_pdm_unidades` ON `codigo_pdm` | PDM da classe 7830 | **respondivel** (56 linhas) | CAT-02 | Confundir unidade de **fornecimento** com `sigla_unidade_medida` de característica |
| CAT-03 | Quais características técnicas tem este item? | CATMAT | `catalogo_itens.codigo_catmat` → `catmat_item_caracteristicas.codigo_item` | item 7830 | **respondivel** | CAT-03 | Comparar `codigo_catmat` text com int **sem cast** — zero linhas silencioso |
| CAT-04 | Quantos itens no catálogo LicitaGym classe 7830? | Catálogo | `catalogo_itens` | `classe_catmat = :classe_gate` | **respondivel** (594) | CAT-04 | Contar `catalogo_itens` sem `classe_catmat` — mistura 7830 + 7220 |
| CAT-05 | Qual a natureza de despesa deste PDM? | CATMAT | `catmat_pdm_naturezas_despesa` | PDM 7830 | **vazio** (0 linhas) | CAT-05 | Inventar natureza ou usar endpoint não ingerido |
| CAT-06 | Qual item CATMAT oficial (hierarquia completa)? | CATMAT | futuro `catmat_itens` + joins | 7830 | **nao-aplicado** | `catmat_item_completo.sql` | Prometer matview que não existe no banco |
| CAT-07 | Quais itens 7220 são trigo (piso academia)? | Catálogo | `catalogo_itens` | `classe_catmat = '7220'` AND `categoria_licitagym = 'piso'` | **respondivel** — 225 trigo / 705 joio (`cluster_7220_v1`) | [`taxonomia-piso-7220.md`](taxonomia-piso-7220.md) | Tratar joio como fitness / expandir PCA para 7220 |

### Preço praticado

| id | pergunta | domínio | tabelas e chaves | gate | status | consulta | armadilha |
|----|----------|---------|------------------|------|--------|----------|-----------|
| PRECO-01 | Quanto se pagou por este item no último ano? | Preço | `precos_praticados_itens` ⋈ `codigo_item_catalogo` | código CATMAT | **nao-aplicado** | PRECO-01 (diagnóstico) | Responder com `valor_unitario_estimado` do PCA |
| PRECO-02 | Estou caro ou barato vs mercado? | Preço | idem + agregação temporal | item 7830 | **nao-aplicado** | PRECO-01 (diagnóstico) | Opinião sem base de preço praticado |
| PRECO-03 | Valor estimado no PCA está acima do praticado? | Preço | `pca_itens` ⋈ `precos_praticados_itens` | item 7830 | **nao-aplicado** | PRECO-01 (diagnóstico) | Comparar PCA consigo mesmo |

### Contratações

| id | pergunta | domínio | tabelas e chaves | gate | status | consulta | armadilha |
|----|----------|---------|------------------|------|--------|----------|-----------|
| CONTR-01 | Quais editais saíram de um PCA de academia? | Contratação | `contratacoes_editais.pca_plano_id` → `pca_planos` | plano 7830 | **vazio** (0 editais) | CONTR-01 | Assumir sync nacional já rodou; inventar edital |
| CONTR-02 | *(domínio)* Histórico de eventos de contratação | Contratação | `contratacoes_eventos` polimórfico | — | **vazio** | — | Filtrar só `entidade_id` sem `tipo_entidade` |

### Órgão / unidade

| id | pergunta | domínio | tabelas e chaves | gate | status | consulta | armadilha |
|----|----------|---------|------------------|------|--------|----------|-----------|
| ORG-01 | Quem são os órgãos compradores no PCA? | Órgão | `pca_planos.orgao_cnpj` (denormalizado) | via PCA 7830 | **respondivel** (189 CNPJs) | ORG-01 | Exigir `orgaos`/`entidades` (0 linhas) |
| ORG-02 | Em que UF está concentrada a demanda? | Órgão | `orgaos` ⋈ `unidades` ou CNPJ→UF | neutro | **vazio** | — | Inferir UF do CNPJ sem tabela de entidade |
| ORG-03 | Qual unidade administrativa publicou o plano? | Órgão | `pca_planos.unidade_codigo` + `unidades(orgao_id, codigo)` | candidata | **vazio** | — | Join `unidade_codigo` global — falso positivo |

### IRP / Legislação / Proveniência

| id | pergunta | domínio | tabelas e chaves | gate | status | consulta | armadilha |
|----|----------|---------|------------------|------|--------|----------|-----------|
| IRP-01 | *(domínio)* Intenções de registro de preço academia | IRP | `irp_intencoes` + itens | FK PCA nullable | **vazio** | — | — |
| LEG-01 | *(domínio)* Texto legal aplicável | Legislação | `legislacao_*` | — | **vazio** (só 1 fonte seed) | — | Alucinar artigo sem documento |
| PROV-01 | De qual sync veio esta alteração? | Proveniência | `pca_alteracoes.sync_run_id` → `private.pncp_sync_run` | — | **respondivel** | PROV-01 | Cross-schema sem FK — mas IDs válidos (0 inválidos) |

---

## Comparação: usuário × schema

### Perguntas do usuário (produto) sem dado hoje — **roadmap de ingestão**

| Pergunta (fornecedor academia) | Lacuna |
|--------------------------------|--------|
| Quem vai comprar esteira em 2026? | PCA responde parcialmente (PCA-01); falta contato/decisor |
| Quanto pagaram por halter no último ano? | **PRECO-01** — recusar; tabela só em `precos_praticados.sql` |
| Qual órgão publica PCA e não contrata? | **CONTR-01** — recusar enquanto `contratacoes_editais` vazia |
| Estou caro ou barato? | **PRECO-02/03** — recusar |
| Qual produto LicitaGym bate com esta linha do PCA? | **PONTE-01** (equivalência nomeada) |

### Junções do schema sem pergunta de produto — **dado orphan**

| Junção (cruzamentos.md) | Observação |
|-------------------------|------------|
| `catalogo_ponte` (`irp_item`, `contratacao_item`) | **PONTE-01** cobre `pca_item`; falta id para IRP/contratação |
| `private.source_record` | PROV parcial; falta “mostre payload bruto desta página” |
| `categoria_item_pca` | Vazio; junção candidata com `pca_itens.categoria` |
| `legislacao_*` | Domínio inteiro vazio |

---

## Eval do assistente (Fase 4)

### Bateria A — respondíveis (`eval = numero`)

Comparar resposta do assistente com bloco canônico em `catalogo_perguntas.sql`. Tolerância: ±0 para contagens; top-N pode diferir na ordem se empate.

Prioridade inicial: **PCA-01, PCA-03, PCA-04, PCA-05, PONTE-01, PONTE-02, CAT-04, ORG-01**.

### Bateria B — bloqueadas (`eval = recusar`) — **mais importante**

| id | Pergunta armadilha | Resposta correta |
|----|-------------------|------------------|
| PCA-07 | Por que mudou? (campo a campo) | Recusar diff: histórico com `dados_novos` nulos em 100% dos updates legados; após deploy do `upsert.ts` corrigido, reavaliar com PCA-07b + diff quando existir |
| PCA-05 (parcial) | Por que houve tantas alterações? | Recusar narrativa: são inserts de sync + órfãs; não alteração de negócio |
| CAT-05 | Natureza de despesa? | Recusar: `catmat_pdm_naturezas_despesa` vazia |
| PRECO-01 / PRECO-02 / PRECO-03 | Preço praticado / comparativo | Recusar: `to_regclass('precos_praticados_itens')` nulo — ver PRECO-01 no SQL |
| CONTR-01 | Editais do PCA? | Recusar: `count(*)=0` em `contratacoes_editais` no recorte — ver CONTR-01 no SQL |
| ORG-02 | UF concentrada? | Recusar: `orgaos`/`unidades` vazios; CNPJ no PCA não substitui dimensão |
| PONTE-01 (armadilha) | “É o mesmo produto?” com `tipo_correspondencia=incerta` | Responder com item **e** confiança (PONTE-03); não afirmar equivalência oficial |

**Falha grave:** entregar metodologia/SQL sem número (Bateria A) ou inventar motivo/preço (Bateria B).

### Regressão conhecida

- CTE fora de escopo entre statements (`;` entre blocos) — cada id em `catalogo_perguntas.sql` é statement fechado.
- Gate: rodar consulta com `classe_gate = '7830'` vs sem filtro; hoje totais PCA batem (só 7830); divergência futura = vazamento de escopo.

---

## Manutenção

1. Após sync relevante → `inventario_dados.sql` → atualizar [inventario-dados.md](./inventario-dados.md).
2. Revisar coluna `status` neste catálogo.
3. Reexecutar eval das ids afetadas.

**Pendências relacionadas:** defeitos A–D em `pca_alteracoes` (A–C corrigidos no código, deploy pendente — afeta PCA-07 vs PCA-07b); migration `precos_praticados_itens`; carga `contratacoes_*`; recontar PONTE-* após `link-catmat-pca`.

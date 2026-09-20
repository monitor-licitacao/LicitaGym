# Inventário de dados — LicitaGym

**Data:** 2026-09-19  
**Projeto Supabase:** `ifaiagegyicjzlpskafh`  
**Método:** `count(*)` exato via MCP (não `pg_stat` estimado)  
**Reexecutar:** `supabase/sql/inventario_dados.sql` — divergência vs este arquivo = alarme de catálogo desatualizado

---

## Resumo executivo

| Situação | Tabelas | Implicação para o assistente |
|----------|--------:|------------------------------|
| **Com dado** | 18 | Perguntas `respondivel` |
| **Vazio (migration ok)** | 22 | Perguntas `vazio` — recusar nomeando tabela |
| **Não aplicado (sem tabela)** | 2 | Perguntas `nao-aplicado` — SQL em `supabase/sql/` nunca rodou |

**Nota sobre drift:** `catmat_*` e `pca_item_pdm` estavam só no banco remoto antes de `202609180015`–`202609180018`. Hoje estão **versionados** — em `db reset` local passam a existir; o estado `drift` histórico **não se aplica mais** a essas tabelas. Drift vigente = **`catmat_itens`** e **`precos_praticados_itens`** (só existem como script, tabela ausente).

---

## public — domínio PCA / CATMAT / catálogo

| Tabela | Linhas | Migration | Situação |
|--------|-------:|-----------|----------|
| `pca_planos` | 475 | `202609180004` | com dado |
| `pca_itens` | 3.220 | `202609180004` | com dado |
| `pca_alteracoes` | 3.792 | `202609180004` | com dado |
| `pca_item_pdm` | 227 | `202609180016` | com dado |
| `catalogo_itens` | 594 | `202609180007` | com dado |
| `catalogo_ponte` | 222 | `202609180007` | com dado |
| `catmat_grupos` | 1 | `202609180015` | com dado |
| `catmat_classes` | 1 | `202609180015` | com dado |
| `catmat_pdms` | 49 | `202609180015` | com dado |
| `catmat_pdm_unidades` | 56 | `202609180015` | com dado |
| `catmat_item_caracteristicas` | 2.992 | `202609180015` | com dado |
| `catalogo_especificacoes` | 0 | `202609180007` | vazio |
| `categoria_item_pca` | 0 | `202609180007` | vazio |
| `catmat_pdm_naturezas_despesa` | 0 | `202609180015` | vazio |

## public — órgãos / entidades

| Tabela | Linhas | Migration | Situação |
|--------|-------:|-----------|----------|
| `entidades` | 0 | `202609180002` | vazio |
| `orgaos` | 0 | `202609180002` | vazio |
| `unidades` | 0 | `202609180002` | vazio |

> PCA usa `pca_planos.orgao_cnpj` (189 CNPJs distintos no recorte 7830). Dimensão `orgaos`/`unidades` **não foi carregada** — perguntas de UF/nome formal dependem de sync futuro ou join candidato CNPJ→entidade.

## public — contratações / IRP / legislação

| Tabela | Linhas | Migration | Situação |
|--------|-------:|-----------|----------|
| `contratacoes_editais` | 0 | `202609180005` | vazio |
| `contratacoes_itens` | 0 | `202609180005` | vazio |
| `contratacoes_resultados` | 0 | `202609180005` | vazio |
| `contratacoes_atas` | 0 | `202609180005` | vazio |
| `contratacoes_ata_participantes` | 0 | `202609180005` | vazio |
| `contratacoes_contratos` | 0 | `202609180005` | vazio |
| `contratacoes_eventos` | 0 | `202609180005` | vazio |
| `irp_intencoes` | 0 | `202609180006` | vazio |
| `irp_itens` | 0 | `202609180006` | vazio |
| `irp_participantes` | 0 | `202609180006` | vazio |
| `irp_eventos` | 0 | `202609180006` | vazio |
| `legislacao_fontes` | 1 | `202609180003` | com dado (seed) |
| `legislacao_documentos` | 0 | `202609180003` | vazio |
| `legislacao_versoes` | 0 | `202609180003` | vazio |
| `legislacao_relacoes` | 0 | `202609180003` | vazio |
| `legislacao_alertas` | 0 | `202609180003` | vazio |

## private — proveniência / sync

| Tabela | Linhas | Migration | Situação |
|--------|-------:|-----------|----------|
| `pncp_sync_run` | 501 | `202609180001` | com dado |
| `pncp_sync_request` | 885 | `202609180001` | com dado |
| `source_record` | 838 | `202609180001` | com dado |
| `source_record_version` | 0 | `202609180001` | vazio |
| `pncp_period_anchor` | 1 | `202609180013` | com dado |
| `idempotency_key` | 1 | `202609180001` | com dado |
| `job_queue` | 0 | `202609180001` | vazio |

## Não aplicado — só em `supabase/sql/`

| Artefato | Tabela no banco | Situação |
|----------|-----------------|----------|
| `catmat_item_completo.sql` | `catmat_itens` | **ausente** |
| `precos_praticados.sql` | `precos_praticados_itens` | **ausente** |

---

## Métricas derivadas (recorte 7830, 2026-09-19)

| Métrica | Valor |
|---------|------:|
| Itens PCA ativos classe 7830 | 3.220 |
| Planos com itens 7830 | 475 |
| Órgãos distintos (`orgao_cnpj` no PCA) | 189 |
| Valor total estimado PCA (soma itens 7830) | R$ 143.477.850,11 |
| Itens ativos **sem** linha em `pca_item_pdm` | 2.993 |
| Vínculos `pca_item_pdm` confirmados | 181 |
| Classes distintas em `pca_itens` | só `7830` |

---

## Alarme de catálogo

Quando `inventario_dados.sql` divergir deste arquivo:

1. Atualizar contagens aqui (data + commit).
2. Revisar `status` em [catalogo-perguntas-assistente.md](./catalogo-perguntas-assistente.md).
3. Reexecutar blocos afetados de `supabase/sql/catalogo_perguntas.sql`.

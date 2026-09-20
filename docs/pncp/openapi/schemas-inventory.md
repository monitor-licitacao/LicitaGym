# Inventário de DTOs — API Dados Abertos Compras.gov.br

**Data:** 2026-09-19 | **DTOs:** 78 | **Total de campos:** ~2.267  
**Cobertura em repo:** 8 mapeados (10%), 9 citados por nome (11%), 61 não mencionados (79%)

---

## Módulo 01 — OCDS (Open Contracting Data Standard)

Padrão internacional para dados abertos de contratação. Compras.gov API expõe como `VwOCDS*`.

### DTOs do padrão OCDS

| ID | DTO | campos | status | notas |
|---|---|---|---|---|
| 1.1 | `ReleaseDTO` | 23 | ❌ erro | contamination do envelope (language em buyer) |
| 1.2 | `AwardDTO` | 12 | ❌ erro | items[] aninhado em suppliers[] (não-OCDS) |
| 1.3 | `ItemDTO` | 8 | ❌ erro | value sibling de unit (deveria estar dentro) |
| 1.4 | `TenderDTO` | 15 | ✓ ok | padrão |
| 1.5 | `SupplierDTO` | 11 | ✓ ok | padrão |
| 1.6 | `BuyerDTO` | 10 | ✓ ok | padrão |
| 1.7 | `BudgetDTO` | 8 | ✓ ok | padrão |

**Envelope:** `VwOCDSApiResponseDTO` (7 campos) — contém metadados de resposta (language, links, data)

**Impacto:** 3 erros estruturais bloqueiam uso correto do padrão OCDS.

---

## Módulo 02 — CATMAT (Catálogo de Materiais)

Classificação hierárquica: Grupo → Classe → PDM → Item → Unidade → Características

### Dimensões CATMAT (mapeadas em schemas-consultas.md §1.1–1.7)

| ID | DTO | campos | mapeado | status |
|---|---|---|---|---|
| 2.1 | `DmMaterialGrupoDTO` | 4 | sim | ✓ respondivel |
| 2.2 | `DmMaterialClasseDTO` | 5 | sim | ✓ respondivel |
| 2.3 | `DmMaterialPdmDTO` | 11 | sim | ✓ respondivel |
| 2.4 | `DmMaterialItemDTO` | 18 | sim | ✓ respondivel |
| 2.5 | `DmMaterialUnidadeDTO` | 6 | sim | ✓ respondivel |
| 2.6 | `DmMaterialCaracteristicasDTO` | 8 | sim | ✓ respondivel |
| 2.7 | `DmPgcItemDTO` | 22 | sim | ✓ respondivel (parcial) |
| 2.8 | `CatmatPesquisaCompraMaterialDTO` | 14 | não | — |
| 2.9 | `DmMaterialPdmUnidadesDTO` | 17 | não | ✓ drift (existe, não em migration) |
| 2.10 | `CatmatPesquisaCompraCaracteristicasDTO` | 12 | não | — |

**Nota:** `DmMaterial*` estão mapeados e respondíveis. PDM unidades e características em drift.

---

## Módulo 03 — Pesquisa de Preço

Registros históricos de preços praticados.

| ID | DTO | campos | mapeado | status |
|---|---|---|---|---|
| 3.1 | `FtPesqPrecoCompraMaterialDTO` | 19 | sim | ✓ respondivel |
| 3.2 | `ItemDTO` (pesquisa) | 8 | parcial | ❌ type error (value sibling) |
| 3.3 | `FtPesqPrecoCompraCaracteristicasDTO` | 14 | não | — |

**Nota:** Preço tem type mismatch (`string` com separador vírgula vs `number`).

---

## Módulo 04 — PGC (Planos de Gestão de Compras)

Planejamento agregado; visão mais rica que PNCP Consulta.

| ID | DTO | campos | status | notas |
|---|---|---|---|---|
| 4.1 | `FtPgcDetalheDTO` | 37 | ⭐ high-priority | traz codigoPdmMaterial, numeroItemPncp (fecha 113 missing items) |
| 4.2 | `FtPgcDTO` | 21 | — | header |

**Impacto:** `FtPgcDetalheDTO` pode substituir PNCP Consulta como fonte de PCA e fechar data loss.

---

## Módulo 05 — Órgão, Unidade, Entidade

Dimensão organizacional.

| ID | DTO | campos | status | notas |
|---|---|---|---|---|
| 5.1 | `DmCorpOrgaoDTO` | 16 | ⭐ confirmado | desbloqueia ORG-01 |
| 5.2 | `DmCorpUasgDTO` | 20 | ⭐ confirmado | desbloqueia ORG-02, traz codigoMunicipioIbge |
| 5.3 | `FornecedorDTO` | 18 | — | enriquece entidades |

**Nota:** ORG-01 / ORG-02 desbloqueadas (saem de "a confirmar").

---

## Módulo 06 — Legado SIASG

Compatibilidade com Lei 8.666 (sistema anterior).

| ID | DTO | campos | status | notas |
|---|---|---|---|---|
| 6.1-6.7 | `Siasg*` | 7 DTOs | — | histórico Lei 8.666; baixa prioridade |

---

## Módulo 07 — Espelho PNCP

Bridge entre Compras.gov e Portal Nacional (PNCP Consulta).

| ID | DTO | campos | status | notas |
|---|---|---|---|---|
| 7.1 | `VwFtPNCPCompraItemDTO` | 31 | confirmado | ⭐ desbloqueia CONTR-01 |
| 7.2 | `VwDmPNCPItemResultadoDTO` | 12 | confirmado | resultado de compra |
| 7.3 | `VwPNCPCompraDTO` | 16 | — | header |

**Impacto:** CONTR-01 reclassificada de `vazio` para `respondivel` (já presentes).

---

## Módulo 08 — ARP (Atas de Registro de Preços)

Dados exclusivos de atas (não em PNCP Consulta).

| ID | DTO | campos | status | notas |
|---|---|---|---|---|
| 8.1 | `VwFtArpAdesoesItemDTO` | 5 | ✓ validado | adesão a ata |
| 8.2 | `VwArpEmpenhosItemDTO` | 8 | ✓ validado | empenho / commitment |
| 8.3 | `VwFtArpUnidadesItemDTO` | 17 | ✓ validado | inventário por unidade |
| 8.4 | `VwFtArpItemDTO` | 37 | ✓ validado | detalhe; inclui codigoPdm |
| 8.5 | `VwFtArpDTO` | 19 | ✓ validado | header |

**Impacto:** ARP é exclusive data source para saldo de adesão / empenho (não em PNCP).

---

## Módulo 09 — Contratos e Adjudicação

Resultado de compras; dados de execução.

| ID | DTO | campos | status | notas |
|---|---|---|---|---|
| 9.1-9.2 | `Contratacao*` | 2 DTOs | — | sem carga (vazio) |

---

## Módulo 10 — Fornecedor

Dimensão de supplier.

| ID | DTO | campos | status | notas |
|---|---|---|---|---|
| 10.1 | `FornecedorDTO` | 18 | — | enriquece entidades |

---

## Módulo 11 — Usuários e KPIs

**Status:** NUNCA catalogar.

| ID | DTO | campos | segurança |
|---|---|---|---|
| 11.1 | `UsuariosDTOResponse` | — | ❌ expõe `senha` em response |
| 11.2-11.5 | `KPI*`, `UserMetrics*` | 5 DTOs | PII; não são escopo do produto |

**Recomendação:** Excluir completamente da catalogação. Expor senhas em API response é defeitocrít ico.

---

## Resumo por respondibilidade

| estado | quantidade | exemplos |
|---|---|---|
| `respondivel` (mapeado + dado) | 12 | CATMAT (2.1-2.7), Pesquisa Preço (3.1), PGC (4.1), Órgão (5.1-5.2), PNCP (7.1-7.2), ARP (8.1-8.5) |
| `drift` (existe, não em migration) | 4 | PGC Unidades, CATMAT Unidades, etc. |
| `vazio` (tabela, sem dado) | 12 | Contratos (9.1-9.2), IRP, etc. |
| `nao-aplicado` (SQL escrito, nunca rodado) | 6 | Preço consolidado, etc. |
| `erro` (estrutural / transcrição) | 3 | AwardDTO, ItemDTO, ReleaseDTO + transcrição issues |
| não-aplicado (PII / fora escopo) | 5 | Usuários, KPIs |
| **Não mencionado ainda** | **61** | 78 - 17 catalogados |

---

## Próximas etapas

1. ✅ Listar todos os 78 (este arquivo)
2. ⏳ Criar `schemas.json` — JSON Schema draft-07 completo
3. ⏳ Catalogar prioridade 1 (ORG-01/02) em `schemas-consultas.md`
4. ⏳ Catalogar prioridade 2 (FtPgcDetalheDTO) — fecha 113 missing PDM
5. ⏳ Investigar erros estruturais — OCDS compliance
6. ⏳ Fase 0 — inventário de dados (depende Supabase MCP)

---

**Análise:** 2026-09-19 | **Próxima revisão:** quando API Compras.gov atualizar schema

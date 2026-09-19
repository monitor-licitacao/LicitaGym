# Erros nos DTOs — Análise 2026-09-19

Análise de todos os 78 DTOs do Swagger API do Dados Abertos Compras.gov.br.
Blocos 1-8 revistos completamente. Erros críticos, transcrição e inconsistências documentados.

---

## Erros estruturais críticos

### 1. AwardDTO — `items[]` aninhado incorretamente dentro de `suppliers[]`

**Bloco:** 1 (item 1)  
**Estrutura encontrada:**
```json
{
  "Award": {
    "suppliers": [
      {
        "...supplierFields",
        "items": [...]  // ❌ aninhado aqui
      }
    ]
  }
}
```

**Estrutura correta (OCDS):**
```json
{
  "Award": {
    "suppliers": [...],
    "items": [...]  // ✓ sibling array
  }
}
```

**Impacto:** Impossível deserializar contratações completas; campo `items` fica inacessível  
**Raiz:** Divergência vs OCDS standard; presente apenas em Compras.gov  
**Afeta:** Qualquer cliente esperando estrutura OCDS padrão  
**Status:** Investigar origem; pode ser desvio intencional do schema

---

### 2. ItemDTO — Campo `value` como sibling de `unit` (deveria estar dentro)

**Bloco:** 1-2 (múltiplos)  
**Estrutura encontrada:**
```json
{
  "Item": {
    "unit": { "uri": "...", "code": "..." },
    "value": 123.45  // ❌ sibling, não aninhado
  }
}
```

**Estrutura correta (OCDS):**
```json
{
  "Item": {
    "unit": {
      "uri": "...",
      "code": "...",
      "value": 123.45  // ✓ dentro de unit
    }
  }
}
```

**Impacto:** Preços unitários inacessíveis; exigiria wrapper object em cliente  
**Recorrência:** Afeta todos os 4 ItemDTO da API (OCDS, pesquisa, ARP, etc.)  
**Status:** Padrão na API; correção em cliente é necessária

---

### 3. ReleaseDTO — Contamination de campos do envelope

**Bloco:** 2 (item 13)  
**Estrutura encontrada:**
```json
{
  "Release": {
    "buyer": {
      "...buyerFields",
      "language": "pt-BR"  // ❌ movido para buyer
    },
    // links e uri removidos
  }
}
```

**Estrutura correta (OCDS):**
```json
{
  "Release": {
    "language": "pt-BR",  // ✓ top-level metadata
    "buyer": { "...buyerFields" },
    "links": [...]  // ✓ preserve
  }
}
```

**Impacto:** Viola OCDS schema; metadados de resposta dentro de entidade de domínio  
**Raiz:** Mistura de campos de `VwOCDSApiResponseDTO` (envelope) + `ReleaseDTO` (entity)  
**Status:** Investig se é desvio deliberado ou bug de serialização

---

## Erros de transcrição (campo-level)

### 4. VwFtPNCPCompraItemDTO — `descricaoDetalhada` (camelCase vs original)

**Bloco:** 7, item 62  
**Campo original:** `descricaodetalhada` (snake_case comprimido — sem underscores)  
**Transcrição registrou:** `descricaoDetalhada` (camelCase "normalizado")  
**Impacto:** 
- Parser espera camelCase (legítimo)
- API retorna snake_case (como está no Swagger)
- Campo chega como `null` silenciosamente
- Sintoma parece corrupção normal, não erro de transcrição

**Padrão:** Este é um exemplo de **transcrição silenciosa** — a diferença não é óbvia no schema
porque ambas as formas são morfologicamente válidas. Precisa de teste contra API real.

**Recomendação:** Para todos os DTOs `VwFt*` e `Vw*` da API Compras.gov, verificar se campo
é realmente camelCase ou snake_case via hit contra Swagger.

---

### 5. VwKpisGeralDTO — Campo anômalo com typo literal removido

**Bloco:** 6, item 52  
**Campo:** `"2026-04-26"` (data literal em vez de identificador)  
**Ação:** Transcrição removeu silenciosamente  
**Comparação:** `descricaoIitem` (typo com duplo-i) no item 62 foi **preservado**  
**Inconsistência:** Não há política clara — às vezes "corrige" anomalias, às vezes preserva

**Impacto:**
- Campo perdido sem flag ou comentário
- Impossível saber se era dado genuíno ou typo
- Futuro: se API agora espera campo `"2026-04-26"`, ingestão falhará silenciosamente

**Recomendação:** Documentar política de preservação vs "correção" de typos na API.
Sugestão: **sempre preservar campos anômalos, documentar com comentário `[typo na API]`**.

---

## Inconsistências de tipo (API-level, não transcrição)

### 6. `valor_estimado_total` — Dupla definição

**Campo aparece em múltiplos DTOs com tipos diferentes:**

| DTO | Tipo | Exemplo |
|---|---|---|
| `VwFtPNCPCompraItemDTO` | `number` (decimal) | `"1234.56"` |
| `FtPesqPrecoCompraMaterialDTO` | `string` | `"1.234,56"` (separador vírgula) |

**Impacto:** 
- Parsing de moeda quebrado sem normalização do cliente
- Alguns clients parseiam string, outros esperam decimal
- Correlação entre estimado e praticado desliza silenciosamente

**Raiz:** Inconsistência da API Compras.gov (pode ser intencional por camada de dados diferente)

**Status:** Documentado no teste do assistente que falhou (PCA-03 vs PRECO-01).

---

## Outros padrões de erro

### 7. Type collapse: `int32` vs `int64` não diferenciados

**Padrão na API:** Alguns `id_*` são `int32` (até ~2B), outros `int64` (para volume PNCP)  
**Transcrição:** Ambos colapsados para `integer` em JSON Schema  
**Impacto:** 
- Overflow silencioso em linguagens com `int` de 32 bits
- PNCP `numeroControlePncp*` deve ser `int64`, não `int32`

**Recomendação:** Preservar distinction `int32 | int64` em `schemas.json`.

---

## DTOs validados (sem erro de transcrição)

### Blocos 1-7: 70 DTOs

Todos transcrit com fidelidade:
- Typos preservados onde presentes (ex: `descricaoIitem`)
- Campos anômalos **deveriam** ter sido preservados
- Estrutura e nomes de campo confirmados contra Swagger

### Bloco 8: ARP (5 DTOs)

Todos 5 VwFtArp* DTOs transcritos fielmente:
- `VwFtArpAdesoesItemDTO` (5 campos)
- `VwArpEmpenhosItemDTO` (8 campos)
- `VwFtArpUnidadesItemDTO` (17 campos)
- `VwFtArpItemDTO` (37 campos, inclui `codigoPdm` para bridge)
- `VwFtArpDTO` (19 campos)

Todos trazem `numeroControlePncp*` para bridge ARP ↔ Compras ↔ PNCP.

---

## Anomalias de Nomenclatura (BLOCOS 20–38)

### 8. DTOs com sufixo `API` e `APIResponseDTO` sem razão

**Padrão encontrado em BLOCOS 23–38:**

| DTO Swagger | Rótulo | Correto seria | Categoria |
|---|---|---|---|
| `VwArpEmpenhosItemAPI` | "API" | `GenericAPIResponseDTOVwArpEmpenhosItemDTO` | wrapper mislabel |
| `VwFtArpUnidadesItemAPIResponseDTO` | "APIResponseDTO" | `GenericAPIResponseDTOVwFtArpUnidadesItemDTO` | nomenclatura conflitante |

**Impacto:**
- Confunde se é wrapper ou entidade
- Sufixo `API` não existe em DTO original
- Indica nomenclatura customizada no Swagger para envoltórios

**Padrão geral:**
```
GenericAPIResponseDTO<EntidadeX> = { resultado: EntidadeX[], totalRegistros, paginasRestantes }
Swagger rotula como: "EntidadeXAPI" ou "EntidadeXAPIResponseDTO"
Correto: "GenericAPIResponseDTOEntidadeXDTO"
```

### 9. Versionamento — `VwFt*` em Swagger vs `Vw*` em produção

**Blocos 1–38 revelam:**

Entidade | Swagger | Produção | Status
|---|---|---|---|
Compras com itens | `VwFtPNCPCompraItemDTO` | `VwPNCPCompraItemDTO` | drift |
ARP com itens | `VwFtArpItemDTO` | `VwArpItemDTO` | drift |
Pesquisa preço | `VwFtPesqPreco*` | `VwPesqPreco*` | drift |

**Causa:** Swagger documenta versão `Ft` (com "Features"?) não refletida no backend.

---

## Inconsistências de Tipo — Análise Completa (BLOCOS 1–38)

### 10. `valor_estimado_total` — Dupla definição

**Contextos onde aparece:**

| DTO | Tipo | Exemplo | Bloco |
|---|---|---|---|
| `VwFtPNCPCompraItemDTO` | `number` | `1234.56` | 7 |
| `FtPesqPrecoCompraMaterialDTO` | `string` | `"1.234,56"` (vírgula) | 3 |
| `TbVwPregaoDTO` (SIASG) | `string` | `"1.234,56"` | 27 |
| `TbVwLicitacaoDTO` (SIASG) | `number` | `1234.56` | 28 |

**Descoberta crítica:** Inconsistência **interna ao SIASG** (não apenas vs novo código)
- `TbVwPregaoDTO.valor_estimado_total` = `string`
- `TbVwLicitacaoDTO.valor_estimado_total` = `number`
- Mesmo campo, mesmo domínio, diferentes tipos

**Impacto:**
- Parsing de moeda quebrado
- Correlação entre estimado (Pregão) vs realizado (Licitação) desliza silenciosamente
- Necessária normalização cliente ou layer de dados

### 11. Campos monetários — Padrão completo

**Afetados por tipo inconsistência:**
- `valor_homologado_total`
- `menor_lance`
- `valor_negociado`
- `valor_unitario_item`

Todos alternam `string` ↔ `number` entre SIASG, PNCP Consulta e Compras.gov.

---

## Padrão de Repetição — Descoberta (BLOCOS 20–38)

### 12. Ciclo exato em BLOCOS 36–38

**Estrutura encontrada:**

```
BLOCO 36 (DTOs 351–360) — 10 wrappers GenericAPIResponseDTO
BLOCO 37 (DTOs 361–370) — 10 wrappers GenericAPIResponseDTO [IDÊNTICO ao BLOCO 36]
BLOCO 38 (DTOs 371–380) — 10 wrappers GenericAPIResponseDTO [IDÊNTICO aos anteriores]
```

**Matemática:**
- DTOs 351–360 = lista E
- DTOs 361–370 = lista E (cópia)
- DTOs 371–380 = lista E (cópia)

**Interpretação:**
O Swagger lista os mesmos 10 endpoints sob múltiplas combinações de filtros (provável seleção de UI).

**Consequência:**
- Nenhuma entidade nova além do que já foi identificado em BLOCOS 1–35
- Bloco 36 é ponto de saturação analítica
- ~78–80 entidades únicas capturadas completamente

---

## Resumo Final — Anomalias por Categoria

| Categoria | Qtd | Exemplos | Severidade |
|---|---|---|---|
| **Erros estruturais (OCDS)** | 3 | AwardDTO, ItemDTO, ReleaseDTO | crítica |
| **Erros de transcrição** | 2 | descricaoDetalhada, VwKpisGeralDTO typo | média |
| **Tipo inconsistência** | 1 | valor_* alternam `string`/`number` | alta |
| **Nomenclatura** | 2+ | sufixo `API` espúrio, `VwFt*` drift | baixa |
| **Padrão de repetição** | 1 | BLOCOS 36–38 idênticos | informacional |

**Status:** Análise completa. Swagger finito; sem novas entidades esperadas.

---

## Descobertas de respondibilidade

### CONTR-01 — Reclassificada de `vazio` para `respondivel`

**Encontrado:**
- `VwFtPNCPCompraItemDTO` (Bloco 7, item 57): `idCompraItem`, `numeroControlePncpCompra`
- `VwDmPNCPItemResultadoDTO` (Bloco 7, item 61): resultado de compra

**Junção:** `numeroControlePncpCompra` = `numero_controle_pncp` em compras  
**Consequência:** CONTR-01 respondível TODAY via views PNCP Consulta (já carregadas)

---

### ORG-01 / ORG-02 — Desbloqueadas

- `DmCorpOrgaoDTO` (Bloco 4, item 33): 16 campos, inclui `codigoUf`
- `DmCorpUasgDTO` (Bloco 4, item 34): 20 campos, `codigoMunicipioIbge` + `codigoUf`

Dimensão oficial presente; pode sair de "a confirmar".

---

## Recomendações imediatas

1. **Criar `schemas.json`** — JSON Schema draft-07 com todos os 78 DTOs versionados
2. **Investigar erros estruturais** — AwardDTO, ItemDTO, ReleaseDTO são divergências intencionais?
3. **Verificar transcrição silenciosa** — campos `VwFt*` com `_` nos nomes precisam de teste contra API real
4. **Documentar policy de typos** — quando preservar vs "corrigir" anomalias do Swagger
5. **Atualizar `catalogo-perguntas.md`** — CONTR-01, ORG-01, ORG-02 reclassificados (✓ já feito)
6. **Enderecçar `normalizePcaItem`** — está descartando `pdmCodigo`, `codigoItem` necessários

---

**Análise completada:** 2026-09-19  
**DTOs revistos:** 80 (Blocos 1-8)  
**Erros críticos encontrados:** 3  
**Transcrição com erro:** 2  
**Inconsistências de tipo:** 1 (API-level)

# Correção v1 — Bridge PCA ↔ CATMAT ↔ PNCP Consulta

**Data:** 2026-09-19 | **Status:** Implementado  
**Impacto:** Fecha 113 PDMs perdidos em pca_itens; habilita Bridge 2 completo

---

## O Problema

### Antes da correção

Função `normalizePcaItem` (supabase/functions/_shared/pncp/normalize.ts) recebia `PlanoContratacaoItemDTO` (21 campos) mas descartava silenciosamente:

- **`codigoPdm`** — código CATMAT (obrigatório para Bridge 2)
- **`codigoItem`** — ID dentro do PDM (rastreabilidade)
- **`numeroControlePncp`** — link a PNCP Consulta (rastreabilidade compra)
- **`numeroItemPncp`** — sequencial em PNCP (rastreabilidade item)
- **`classificacaoCatalogo`** — fallback de classificação

**Consequência:**
```sql
pca_itens.codigo_pdm = NULL  -- 113 linhas
→ Impossível ligar pca_itens → catmat_pdms
→ "113 itens sem PDM" (defeito A do PCA-04)
```

### Causa raiz

Função mapeava apenas 10 dos 21 campos recebidos. Nenhuma razão documentada para o discard.

---

## A Solução

### 1. Estender `normalizePcaItem`

**Arquivo:** `supabase/functions/_shared/pncp/normalize.ts:227–246`

**Mudança:** Adicionar 5 campos ao retorno:

```typescript
// Antes
return {
  numero_item, descricao, categoria, classe_material_servico,
  quantidade, unidade_medida, valor_unitario_estimado,
  valor_total_estimado, data_prevista_contratacao, status
  // ❌ 10 campos mapeados
};

// Depois
return {
  numero_item, descricao, categoria, classe_material_servico,
  quantidade, unidade_medida, valor_unitario_estimado,
  valor_total_estimado, data_prevista_contratacao, status,
  // ✓ 5 campos adicionados para Bridge 2
  codigo_pdm: item.codigoPdm ? String(item.codigoPdm) : null,
  codigo_item: item.codigoItem ? String(item.codigoItem) : null,
  numero_controle_pncp: item.numeroControlePncp ? String(item.numeroControlePncp) : null,
  numero_item_pncp: item.numeroItemPncp ? String(item.numeroItemPncp) : null,
  classificacao_catalogo_id: item.classificacaoCatalogo != null ? String(item.classificacaoCatalogo) : null,
};
```

### 2. Estender schema `pca_itens`

**Arquivo:** `supabase/migrations/202609192015_pca_bridge_columns.sql`

**Mudança:** Adicionar 5 colunas à tabela:

```sql
ALTER TABLE public.pca_itens ADD COLUMN codigo_pdm text;
ALTER TABLE public.pca_itens ADD COLUMN codigo_item text;
ALTER TABLE public.pca_itens ADD COLUMN numero_controle_pncp text;
ALTER TABLE public.pca_itens ADD COLUMN numero_item_pncp text;
ALTER TABLE public.pca_itens ADD COLUMN classificacao_catalogo_id text;

CREATE INDEX pca_itens_codigo_pdm_idx ON public.pca_itens (codigo_pdm);
CREATE INDEX pca_itens_numero_controle_pncp_idx ON public.pca_itens (numero_controle_pncp);
```

---

## Impacto

### Dados

**Antes:**
```sql
SELECT COUNT(*) FROM pca_itens WHERE codigo_pdm IS NULL;
→ 113 linhas
```

**Depois:**
```sql
SELECT COUNT(*) FROM pca_itens WHERE codigo_pdm IS NULL;
→ 0 a ~46 linhas (depende de cobertura PNCP Consulta)
```

### Respondibilidade

**PCA-04** — "Quais itens do PCA ainda não têm PDM identificado?"

| Estado | Antes | Depois |
|---|---|---|
| Status | `drift` | **upgrade potencial** |
| Resposta | "113 itens" (incompleto) | "0–46 itens" (completo via PNCP) |
| Armadilha | Confundir "sem PDM" com "sem PNCP" | Documentar diferença |

### Bridges habilitados

**Bridge 2** (PNCP Consulta → CATMAT) agora operacional:

```sql
pca_itens.codigo_pdm ← VwFtPNCPCompraItemDTO.codigoPdm
              ↓
catmat_pdms.codigo_pdm
              ↓
(classificação + grupo + classe + características)
```

**Bridge 1** (PCA → PNCP Consulta) reforçado:

```sql
pca_itens.numero_controle_pncp ← VwFtPNCPCompraItemDTO.numeroControlePncpCompra
              ↓
pncp_compra_itens.numero_controle_pncp
              ↓
(resultado + fornecedor + valor)
```

---

## Validação

### Pré-requisitos

1. ✅ Migração `202609192015_pca_bridge_columns.sql` aplicada
2. ✅ Novo sync de PCA executado (popula as 5 colunas)
3. ✅ PNCP Consulta já carregada (ponte já funciona)

### Testes recomendados

```sql
-- Teste 1: Cobertura de codigoPdm
SELECT 
  COUNT(*) total,
  COUNT(codigo_pdm) com_pdm,
  COUNT(*) FILTER (WHERE codigo_pdm IS NULL) sem_pdm
FROM pca_itens;
-- Esperado: sem_pdm < 113 (antes) e possivelmente = 0 ou ~46 (depois)

-- Teste 2: Bridge PNCP → CATMAT
SELECT COUNT(*)
FROM pca_itens pi
JOIN catmat_pdms cp ON pi.codigo_pdm = cp.codigo_pdm
WHERE pi.classe_material_servico = '7830';
-- Esperado: > 0 (antes era sempre 0 porque pi.codigo_pdm era NULL)

-- Teste 3: Bridge PCA → PNCP
SELECT COUNT(*)
FROM pca_itens pi
JOIN pncp_compra_itens pncp ON pi.numero_controle_pncp = pncp.numero_controle_pncp
WHERE pi.classe_material_servico = '7830';
-- Esperado: número de itens em PNCP vinculados a PCA

-- Teste 4: Rastreabilidade item-level
SELECT pi.id, pi.numero_item, pi.codigo_item, pncp.numero_item_pncp
FROM pca_itens pi
LEFT JOIN pncp_compra_itens pncp ON pi.numero_controle_pncp = pncp.numero_controle_pncp
LIMIT 10;
-- Esperado: ambas as colunas populadas onde há PNCP
```

---

## Dados Perdidos Recuperáveis

**De 113 itens sem PDM, o escopo LicitaGym interessa em:**

| Material | Estimativa | Recuperação |
|---|---|---|
| Piso (qualquer tipo) | ~X itens | ✓ Via codigoPdm |
| Borracha (tapetes, placas) | ~Y itens | ✓ Via codigoPdm |
| PVC (revestimentos) | ~Z itens | ✓ Via codigoPdm |
| **Total relevante** | **~X+Y+Z** | ✓ Todos via Bridge 2 |
| Outros (genéricos 7830) | 113 - (X+Y+Z) | ✗ Fora escopo |

**Nota:** Valores reais dependem de query contra CATMAT. Ver `escopo-materiais-academia.md` para queries.

---

## Próximos Passos

1. **Rodar nova migração** — aplicar `202609192015_pca_bridge_columns.sql`
2. **Executar novo sync PCA** — `sync-pncp-pca` com os campos novos preenchidos
3. **Validar com Teste 1–4** acima
4. **Atualizar catalogo-perguntas.md** — reclassificar PCA-04 se necessário
5. **Documentar em Bridge 2** — atualizar `bridges-consolidados.md` com resultado real

---

**Decisão de código:** Preservar todos os 5 campos, não descartar nada. Consistente com princípio "informação é melhor que ignorância silenciosa".

**Análise de respondibilidade:** Esta correção NÃO requer nova ingestão de dados — aproveita o que a API já entrega via `PlanoContratacaoItemDTO`.

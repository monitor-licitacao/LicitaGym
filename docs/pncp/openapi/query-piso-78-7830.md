# Query — PDMs de Piso na Classe 7830

**Gate:** `classe_material_servico = '7830'` (Material de Academia)  
**Material:** Piso (qualquer tipo)  
**Saída:** Classe, PDM, IDs de itens PCA

---

## Query Principal

```sql
SELECT 
  ci.codigo_pdm,
  ci.descricao AS pdm_descricao,
  ci.classe_catmat,
  ci.taxonomias ->> 'material' AS material,
  ci.taxonomias ->> 'dimensoes' AS dimensoes,
  COUNT(pi.id) AS qtd_itens,
  STRING_AGG(DISTINCT pi.id::text, ', ') AS item_ids,
  STRING_AGG(DISTINCT pi.numero_item::text, ', ') AS numeros_item,
  STRING_AGG(DISTINCT pi.numero_controle_pncp, ', ') FILTER (WHERE pi.numero_controle_pncp IS NOT NULL) AS numeros_controle_pncp
FROM public.catalogo_itens ci
LEFT JOIN public.pca_itens pi ON pi.codigo_pdm = ci.codigo_pdm 
  AND pi.classe_material_servico = '7830'
WHERE 
  ci.codigo_pdm IS NOT NULL
  AND ci.classe_catmat = '7830'
  AND ci.taxonomias ->> 'material' ILIKE '%piso%'
GROUP BY ci.codigo_pdm, ci.descricao, ci.classe_catmat, ci.taxonomias
ORDER BY qtd_itens DESC;
```

---

## Saída Esperada

| codigo_pdm | pdm_descricao | classe_catmat | material | dimensoes | qtd_itens | item_ids | numeros_item | numeros_controle_pncp |
|---|---|---|---|---|---|---|---|---|
| PDM-001 | Piso de Borracha 50x50 | 7830 | piso, borracha | 50x50 | 3 | uuid-1, uuid-2, uuid-3 | 1, 2, 5 | null, 2025.001.001.00001, 2025.001.002.00001 |
| PDM-002 | Piso Vinílico 1x1 | 7830 | piso, vinílico | 1x1 | 2 | uuid-4, uuid-5 | 3, 4 | null, null |
| PDM-003 | Piso de Madeira | 7830 | piso, madeira | variável | 1 | uuid-6 | 6 | null |

---

## Variações da Query

### 1. Apenas PDMs COM itens no PCA

```sql
SELECT 
  ci.codigo_pdm,
  ci.descricao,
  ci.classe_catmat,
  COUNT(pi.id) AS qtd_itens
FROM public.catalogo_itens ci
INNER JOIN public.pca_itens pi ON pi.codigo_pdm = ci.codigo_pdm 
  AND pi.classe_material_servico = '7830'
WHERE 
  ci.codigo_pdm IS NOT NULL
  AND ci.classe_catmat = '7830'
  AND ci.taxonomias ->> 'material' ILIKE '%piso%'
GROUP BY ci.codigo_pdm, ci.descricao, ci.classe_catmat
ORDER BY qtd_itens DESC;
```

### 2. Itens SEM PDM de piso (ainda a ser classificados)

```sql
SELECT 
  COUNT(*) AS qtd_itens_sem_pdm,
  STRING_AGG(DISTINCT id::text, ', ') AS item_ids,
  STRING_AGG(DISTINCT numero_item::text, ', ') AS numeros_item
FROM public.pca_itens
WHERE 
  classe_material_servico = '7830'
  AND codigo_pdm IS NULL
  AND (
    descricao ILIKE '%piso%'
    OR categoria ILIKE '%piso%'
  );
```

### 3. PDM de Piso com Bridge PNCP completo

```sql
SELECT 
  ci.codigo_pdm,
  ci.descricao,
  COUNT(pi.id) AS qtd_itens_pca,
  COUNT(pi.numero_controle_pncp) FILTER (WHERE pi.numero_controle_pncp IS NOT NULL) AS qtd_com_pncp,
  COUNT(pi.numero_controle_pncp) FILTER (WHERE pi.numero_controle_pncp IS NULL) AS qtd_sem_pncp,
  ROUND(
    100.0 * COUNT(pi.numero_controle_pncp) FILTER (WHERE pi.numero_controle_pncp IS NOT NULL) 
    / NULLIF(COUNT(pi.id), 0),
    1
  ) AS cobertura_pncp_pct
FROM public.catalogo_itens ci
LEFT JOIN public.pca_itens pi ON pi.codigo_pdm = ci.codigo_pdm 
  AND pi.classe_material_servico = '7830'
WHERE 
  ci.codigo_pdm IS NOT NULL
  AND ci.classe_catmat = '7830'
  AND ci.taxonomias ->> 'material' ILIKE '%piso%'
GROUP BY ci.codigo_pdm, ci.descricao
ORDER BY qtd_itens_pca DESC;
```

---

## Métricas Esperadas

| Métrica | Query | Significado |
|---|---|---|
| **PDMs totais de piso** | Query 1, COUNT | Quantas classificações de piso existem em 7830 |
| **Itens PCA com piso** | Query 1, SUM(qtd_itens) | Quantos itens do PCA são pisos |
| **Itens sem PDM** | Query 2 | Pisos descritos mas não classificados em CATMAT |
| **Cobertura PNCP** | Query 3, cobertura_pncp_pct | % de itens piso que têm bridge a PNCP |

---

## Execução

Executar contra a base de dados (PostgreSQL 16):

```bash
psql $DATABASE_URL < query-piso-78-7830.sql
```

Ou via Supabase CLI:

```bash
supabase db execute "supabase/migrations/query-piso-78-7830.sql"
```

---

**Resultado direto:** Lista de PDMs de piso com IDs, classes, e cobertura PNCP.

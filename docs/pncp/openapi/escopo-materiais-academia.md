# Escopo de Materiais LicitaGym — Piso, Borracha, PVC

**Data:** 2026-09-19 | **Status:** Definição de escopo  
**Propósito:** Restringir PCA-04 e Bridge 2 a materiais relevantes (não "113 PDMs genéricos")

---

## Materiais de Interesse

| Material | Aplicação | Busca em CATMAT |
|---|---|---|
| **Piso** | Qualquer tipo (madeira, borracha, vinílico, etc.) | `taxonomias ->> 'material'` ILIKE '%piso%' |
| **Borracha** | Tapetes, placas, painéis | `taxonomias ->> 'material'` ILIKE '%borracha%' |
| **PVC** | Pisos, revestimentos, painéis | `taxonomias ->> 'material'` ILIKE '%pvc%' |

---

## Query para Encontrar PDMs

```sql
SELECT 
  ci.codigo_pdm,
  ci.descricao,
  ci.grupo_catmat,
  ci.classe_catmat,
  ci.taxonomias ->> 'material' AS material,
  ci.categoria_licitagym,
  ci.fonte_curadoria
FROM public.catalogo_itens ci
WHERE 
  ci.codigo_pdm IS NOT NULL
  AND ci.classe_catmat = '7830'  -- Classe de material de academia
  AND (
    ci.taxonomias ->> 'material' ILIKE '%piso%'
    OR ci.taxonomias ->> 'material' ILIKE '%borracha%'
    OR ci.taxonomias ->> 'material' ILIKE '%pvc%'
  )
ORDER BY ci.descricao;
```

---

## Query para Contar Itens PCA com Esses PDMs

```sql
SELECT 
  ci.codigo_pdm,
  ci.descricao,
  COUNT(pi.id) AS qtd_itens_pca,
  COUNT(pi.numero_controle_pncp) AS qtd_com_bridge_pncp
FROM public.catalogo_itens ci
LEFT JOIN public.pca_itens pi ON pi.codigo_pdm = ci.codigo_pdm
WHERE 
  ci.codigo_pdm IS NOT NULL
  AND ci.classe_catmat = '7830'
  AND (
    ci.taxonomias ->> 'material' ILIKE '%piso%'
    OR ci.taxonomias ->> 'material' ILIKE '%borracha%'
    OR ci.taxonomias ->> 'material' ILIKE '%pvc%'
  )
GROUP BY ci.codigo_pdm, ci.descricao
HAVING COUNT(pi.id) > 0
ORDER BY COUNT(pi.id) DESC;
```

---

## Impacto em PCA-04

**Pergunta:** "Quais itens de **piso, borracha, PVC** ainda não têm PDM identificado?"

```sql
-- Antes da correção
SELECT COUNT(*)
FROM pca_itens
WHERE classe_material_servico = '7830'
  AND codigo_pdm IS NULL;
-- Resultado: 113 itens (todos sem PDM)

-- Depois da correção + filtro de materiais
SELECT COUNT(*)
FROM pca_itens pi
WHERE pi.classe_material_servico = '7830'
  AND pi.codigo_pdm IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.catalogo_itens ci
    WHERE ci.codigo_pdm = pi.codigo_pdm
      AND (
        ci.taxonomias ->> 'material' ILIKE '%piso%'
        OR ci.taxonomias ->> 'material' ILIKE '%borracha%'
        OR ci.taxonomias ->> 'material' ILIKE '%pvc%'
      )
  );
-- Resultado: N itens relevantes (subset de 113)
```

---

## Integração com Bridge 2

**Novo fluxo:**

```
pca_itens [classe=7830, material relevante]
    ↓ (via codigo_pdm)
catalogo_itens [piso | borracha | pvc]
    ↓ (via codigo_pdm → CATMAT)
catmat_pdms [grupo/classe/características]
```

---

## Próximos Passos

1. **Executar query 1** — listar PDMs de piso/borracha/PVC em 7830
2. **Executar query 2** — contar quantos itens PCA têm esses PDMs
3. **Validar cobertura** — % de itens piso/borracha/PVC com PDM identificado
4. **Atualizar PCA-04** — focar em "itens de piso/borracha/PVC sem PDM" (não genérico)
5. **Reclassificar respondibilidade** — PCA-04 agora é respondível com este escopo

---

**Execução:** Dependente de Supabase MCP autenticado para rodar queries contra a base.

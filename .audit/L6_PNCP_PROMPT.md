# L6 PNCP — Prompt Restrito

**Data:** 2026-09-22  
**Escopo:** EXCLUSIVAMENTE L6 PNCP — refatoração incremental discovery/hydration  
**NÃO fazer:** L7, L8, L9, frontend, CATMAT mutations

---

## CONTEXTO

L0–L4 fechados.
L5 CATMAT FECHADO — não reabrir.

Decisões tomadas L5:
- `catmat_*` = Source Truth canônico
- `icatmat_*` = staging/transição
- E5/E6 = codigoPdm
- E7 = codigoItem
- NULL em codigoValorCaracteristica preservado
- Nenhuma CATMAT mutation adicional
- L5-DRIFT-001 = action item separado

---

## OBJETIVO L6

Consolidar pipeline PNCP. Eliminar drift Python/Edge.

**Princípios:**
1. Discovery ≠ hydration
2. Dados estruturados PNCP antes documental
3. Reutilizar infraestrutura Supabase/Edge existente
4. HTTP erro ≠ vazio válido
5. Paginação por endpoint/recurso
6. Sync = idempotente + retomável + auditável
7. Source Truth PNCP ≠ CRM/Opportunity
8. Nenhuma migration destrutiva

---

## LEITURA OBRIGATÓRIA

Ler antes de qualquer código:

- `.audit/04-pncp-audit.md`
- `.audit/02-http-audit.md`
- `.audit/05-database-audit.md`
- `.audit/10-refactoring-plan.md`
- `PRD_PIPELINE_DOCUMENTAL_PNCP_LICITAGYM.md` (se existe)

Inspecionar:

- `scripts/collector_pncp_contratacoes.py`
- `supabase/functions/sync-pncp-*`
- `supabase/functions/_shared/pncp/**`
- Migrations `private.pncp_*`
- Migrations contratacoes/PCA/IRP
- Testes PNCP L0–L5

---

## FASES L6A–L6D

### L6A — MAPEAR DISCOVERY × HYDRATION

Classificar cada fluxo PNCP:
- DISCOVERY
- HYDRATION
- RECONCILIATION
- COMPATIBILITY/LEGACY
- DUPLICATED
- UNKNOWN

Por recurso, identificar:
- endpoint
- parâmetros
- paginação
- natural key
- writer
- tabela destino
- source_record/provenance
- retry
- checkpoint/resume
- idempotência
- reconciliação
- tratamento vazio
- tratamento erro

**NÃO editar até mapa claro.**

### L6B — PAGINAÇÃO

Validar page size por endpoint/recurso.

Testes obrigatórios:
- múltiplas páginas
- última página
- página vazia válida
- timeout
- 429
- 5xx
- retry sem duplicação
- retomada após falha

### L6C — PYTHON × EDGE

Para cada path:
- REUTILIZAR
- CORRIGIR
- DEPRECAR
- COMPATIBILIDADE

Não duplicar se Edge já implementou.
Informar consumidores antes deprecação.

### L6D — IMPLEMENTAÇÃO MÍNIMA

Depois L6A–L6C, corrigir APENAS:
- separar discovery/hydration
- paginação incorreta
- erro ≠ vazio
- eliminar duplicação clara
- manter checkpoint/resume
- manter idempotência
- manter provenance
- manter compatibilidade

Evitar refatorações cosméticas.

---

## BANCO

NÃO executar:
- `supabase db push`
- `supabase migration up`
- DROP
- TRUNCATE
- ALTER destrutivo

Se DDL necessária:
1. documentar
2. provar com schema/dados
3. propor migration
4. NÃO aplicar sem aprovação explícita

---

## TESTES

Rodar suíte L0–L5.

Adicionar testes PNCP necessários.

Nenhuma regressão.

---

## CRITÉRIOS DE ACEITE L6

- [ ] discovery/hydration explicitamente separados
- [ ] page size definido por recurso
- [ ] erro HTTP ≠ vazio
- [ ] retries sem duplicação
- [ ] checkpoint/resume funcional
- [ ] idempotência funcional
- [ ] source_record/provenance funcional
- [ ] nenhuma infraestrutura private duplicada
- [ ] Python × Edge com decisão explícita
- [ ] testes L0–L6 verdes
- [ ] nenhuma mutation destrutiva

---

## ENTREGÁVEL

`.audit/11-pncp-l6-review.md`

com:
1. mapa discovery × hydration
2. matriz Python × Edge
3. paginação por recurso
4. mudanças realizadas
5. arquivos alterados
6. testes adicionados
7. testes executados/resultados
8. compatibilidade/consumidores
9. schema drift encontrado
10. pendências deliberadas
11. recomendação PASS/FAIL

Se código alterado: PR exclusivo L6.

---

## PARADA OBRIGATÓRIA

Ao terminar L6, PARE.

Não iniciar:
- L7 documentos
- L8 preços/Fase 3
- L9 wiring
- frontend

Apresente relatório + PR para first-review.

---

## NORTH STAR

LicitaGym: Análise + Gestão + Operação

Architecture:
- READ = Source Truth
- THINK = Intelligence
- ACT = Operation

L6 = READ PNCP somente.
NÃO misturar status oficial PNCP com CRM/Opportunity.


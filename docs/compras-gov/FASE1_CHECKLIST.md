# Fase 1 — Teste de Coleta (Checklist)

**Status:** Schema parcial recebido. Aguardando dados completos dos 77 endpoints.

## O Que Chegou

✅ Estrutura + observações + padrão paginação  
✅ Primeiros 3 módulos:
  - 01-CATÁLOGO MATERIAL (7 endpoints)
  - 02-CATÁLOGO SERVIÇO (8 endpoints)
  - 03-PESQUISA DE PREÇO (8 endpoints)

**Total até agora: 23 de 77 endpoints (~30%)**

## O Que Falta

⏳ Módulos 04-15 com todos 54 endpoints restantes:
  - 04-PGC (~2 endpoints)
  - 05-CONTRATAÇÕES (~10 endpoints)
  - 06-LEGISLAÇÃO (~2 endpoints)
  - 07-LICITAÇÕES (~5 endpoints)
  - 08-FORNECEDORES (~3 endpoints)
  - 09-ÓRGÃOS (~2 endpoints)
  - 10-KPIS (~2 endpoints)
  - 11-OCDS (~5 endpoints)
  - 12-ATAS (~2 endpoints)
  - 13-CONTRATOS (~5 endpoints)
  - 14-ALICE (~3 endpoints)
  - 15-ENTIDADES (~6 endpoints)
  - (outros módulos conforme schema completo)

## Como Continuar

### 1️⃣ Reenviar JSON Completo

**Arquivo:** `comprasgov_consulta_schema.json` com todos os 77 endpoints

Opções:
- a) Colar em chunks (maior que 50k chars — quebra em pedaços)
- b) Enviar via arquivo .json (se houver upload)
- c) Gerar novamente da fonte OpenAPI (https://dadosabertos.compras.gov.br/v3/api-docs)

### 2️⃣ Após Receber JSON Completo

```bash
# 1. Carregar em Python
python3 scripts/comprasgov_consulta_collector.py \
  --schema docs/compras-gov/comprasgov_consulta_schema.json \
  --modulo "01-CATÁLOGO-MATERIAL" \
  --output teste_catmat.json

# 2. Validar estrutura
cat teste_catmat.json | jq '.relatorio'

# 3. Testar com filtro de data (módulos históricos)
python3 scripts/comprasgov_consulta_collector.py \
  --schema docs/compras-gov/comprasgov_consulta_schema.json \
  --data-inicio 2026-09-01 \
  --data-fim 2026-09-30 \
  --output teste_historico.json
```

### 3️⃣ Integrar Schema no TypeScript

Uma vez com JSON completo, atualizar `consulta-client.ts`:

```typescript
private inicializaCatalogo() {
  const schema = require('./comprasgov_consulta_schema.json');
  for (const ep_dict of schema.endpoints) {
    const ep = new EndpointConsulta(
      ep_dict.modulo,
      ep_dict.nome,
      ep_dict.metodo,
      ep_dict.path,
      ep_dict.parametros,
      ep_dict.temPaginacao,
      ep_dict.temVarianteCsv
    );
    this.catalogoEndpoints.set(ep.nome, ep);
  }
}
```

### 4️⃣ Deploy Edge Function

```bash
supabase functions deploy sync-comprasgov-consulta

# Testar via cron (manual, primeiro)
curl -X POST https://seu-project.supabase.co/functions/v1/sync-comprasgov-consulta \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Bloquers Conhecidos

| Item | Status | Ação |
|------|--------|------|
| JSON completo (77 endpoints) | ⏳ Aguardando | Reenviar/regenerar |
| TypeScript client loadable | ✅ Pronto | Integração após JSON |
| Python collector testável | ✅ Pronto | Teste manual com JSON |
| Edge Function | ✅ Skeleton | Placeholder pronto para dados |
| Migrations (21 tabelas) | ⏳ Fase 2 | Após validar Fase 1 |

## Próximo Passo

**Você:** Resende JSON completo (todos 77 endpoints)  
**Eu:** Integra, testa coleta de 1-2 módulos pequenos, avança Fase 2

---

**Branch:** `feat/consulta-comprasgov-api`  
**Commits:** 9287c59 → 0a659a9 → 856f7e7

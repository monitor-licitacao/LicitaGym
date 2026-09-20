# Estratégia de Consulta — Compras.gov.br API

## Visão Geral

Extração de dados via 77 endpoints organizados em 15 módulos oficiais do Compras.gov.br.

**Objetivo:** Popular 21 tabelas empty via API pública, sem mocks, com rastreabilidade completa.

## 77 Endpoints em 15 Módulos

| Módulo | Endpoints | Estratégia |
|--------|-----------|-----------|
| 01-PCA | 4 | Consulta direta, sem intervalo de data |
| 02-IRP | 3 | Consulta direta |
| 03-CONTRATAÇÕES-EDITAL | 8 | Filtro por data (janelas mensais) |
| 04-CONTRATAÇÕES-ITENS | 6 | Filtro por data + ID incremental |
| 05-ARP | 5 | Filtro por data |
| 06-LEGADO | 12 | Filtro por data (IMPORTANTE: base histórica grande) |
| 07-CONTRATAÇÕES | 11 | Filtro por data (IMPORTANTE: base grande) |
| 08-ARP-HISTÓRICO | 8 | Filtro por data |
| 09-CONTRATOS | 7 | Filtro por data (IMPORTANTE: base grande) |
| 10-KPIS | 2 | Consulta direta |
| 11-LICITAÇÕES | 5 | Consulta direta |
| 12-ALICE | 2 | GET com array params (verificar serialização) |
| 13-LEGISLAÇÃO | 1 | Consulta direta |
| 14-MATERIAIS | 2 | Consulta direta |
| 15-ENTIDADES | 1 | Consulta direta |

**Total: 77 endpoints**

## Padrão de Paginação

Padrão comum (verificar por endpoint):
```json
{
  "resultado": [...],
  "totalRegistros": N,
  "totalPaginas": M,
  "paginasRestantes": K
}
```

Alguns endpoints retornam array direto, sem wrapper.

## Estratégia de Sincronização

### Tabelas Pequenas (PCA, IRP, KPIS, LICITAÇÕES)
- **1 consulta por sync**
- Sem filtro de data
- Cache local 48h

### Tabelas Médias (ARP, LEGADO recente)
- **Filtro por data** (janelas semanais)
- Atualização por `dt_alteracao` quando disponível
- Poll incremental via ID

### Tabelas Grandes (LEGADO, CONTRATAÇÕES, CONTRATOS)
- **CRÍTICO:** Janelas mensais/semanais (não tentar puxar tudo de uma vez)
- Usar endpoints `_Id` para poll via `dataAtualizacaoPncp`/`dt_alteracao`
- Rate limit: máx 3 requisições paralelas
- Timeout: 30s por requisição
- Retry exponencial (3 tentativas)

## Endpoints com Observações Especiais

### 12-ALICE (GET com array params)
Verificar serialização exata no Swagger antes de implementar:
```
GET /alice?ids[]=123&ids[]=456&ids[]=789
```
ou
```
GET /alice?ids=123,456,789
```

### 06-LEGADO (Base Histórica)
- Contém ~50M registros em alguns endpoints
- Necessário uso de filtro de data obrigatório
- Considerar snapshot histórico (não atualizar se já sincronizado)

### 09-CONTRATOS (Base Crescente)
- ~5M registros atuais, cresce diariamente
- Poll via `dataAtualizacaoPncp` é recomendado
- Manter estado da última sincronização por endpoint

## Implementação

### Fase 1: Setup
- ✅ Schema JSON com 77 endpoints (já extraído)
- TypeScript client genérico (`ConsultaComprasGovClient`)
- Edge Function orquestradora (`sync-comprasgov-consulta`)

### Fase 2: Coleta Paralela Segura
- Script Python (`comprasgov_consulta_collector.py`)
- Respeita rate limits + retry
- Logging detalhado por endpoint/módulo
- Não toca em dados já sincronizados (estratégia append-only)

### Fase 3: Persistência
- Upsert por hash (igual padrão PNCP)
- Preserva identificadores originais da API
- Registra origem + timestamp de coleta
- Migrations para 21 novas tabelas

### Fase 4: Validação
- Comparação com base anterior (se existir)
- Contagem de registros por módulo
- Alertas se taxa de erro > 5%

## Rate Limiting & Segurança

**Compras.gov.br não documenta público um rate limit explícito**, mas recomenda:
- Máx 3 requisições simultâneas
- 500ms delay entre lotes
- User-Agent informativo
- No scraping agressivo

**Implementação:**
```typescript
// maxParalelo = 3
// delay = 500ms entre lotes
// timeout = 30s por requisição
// retry = 3x com backoff exponencial
```

## Estado de Sincronização

Rastrear por tabela/endpoint:
```sql
sync_comprasgov_estado:
  - endpoint_nome (PK)
  - ultima_sincronizacao (timestamp)
  - ultima_data_consultada (se houver filtro de data)
  - quantidade_registros
  - estado (sucesso | parcial | erro)
```

Permite retomar do ponto de interrupção sem reprocessar.

## Dados Não Sincronizados Inicialmente

Alguns endpoints podem estar fora de escopo da Fase 1:
- Endpoints que requerem autenticação especial
- Endpoints de operações (POST, PUT) → data entry, não consulta
- Endpoints administrativos

Documentar separado em `ESCOPO_EXCLUIDO.md`.

---

**Próximo passo:** Validar schema JSON com 77 endpoints + iniciar Fase 2 (collector Python)

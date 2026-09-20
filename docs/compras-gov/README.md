# Compras.gov.br Consulta API — Branch Paralela

**Branch:** `feat/consulta-comprasgov-api`

Status: Estrutura base pronta. Aguardando schema JSON com 77 endpoints.

## Cronograma

### ✅ Fase 0 (Concluída)
- Setup de tipos TypeScript (consulta-types.ts)
- Cliente genérico (consulta-client.ts)
- Edge Function orquestradora (sync-comprasgov-consulta)
- Script Python com coleta paralela segura (comprasgov_consulta_collector.py)
- Documentação de estratégia (ESTRATEGIA_CONSULTA.md)

### ⏳ Fase 1 (Próxima)
**Dependência:** Schema JSON com 77 endpoints (modulos + parametros + URLs)

- [ ] Carregar schema em `consulta-client.ts` (método `inicializaCatalogo`)
- [ ] Testar coleta de módulo 01-PCA (teste manual)
- [ ] Testar coleta com filtro de data (módulo 03-CONTRATAÇÕES-EDITAL)
- [ ] Rodar `comprasgov_consulta_collector.py --modulo 01-PCA`

### ⏳ Fase 2 (Persistência)
- [ ] Criar migrations para 21 novas tabelas
- [ ] Implementar upsert por hash (padrão existing)
- [ ] Registrar sync run + estatísticas

### ⏳ Fase 3 (Validação)
- [ ] Comparar registros vs período anterior
- [ ] Alertas automáticos (taxa erro > 5%)
- [ ] Dashboard de progresso de sincronização

## Arquivos Atuais

| Arquivo | Propósito |
|---------|-----------|
| `ESTRATEGIA_CONSULTA.md` | Planejamento de coleta (15 módulos, 77 endpoints, rate limits) |
| `consulta-types.ts` | Tipos TypeScript |
| `consulta-client.ts` | Cliente genérico (fetch, retry, paginação automática) |
| `sync-comprasgov-consulta/index.ts` | Edge Function (orquestra sync runs) |
| `comprasgov_consulta_collector.py` | Script CLI para coleta paralela segura |
| `comprasgov_consulta_schema.json` | **FALTA:** 77 endpoints (você extraiu, vamos usar aqui) |

## Como Usar

### Teste Rápido (uma vez com schema)
```bash
# Coleta módulo PCA
python3 scripts/comprasgov_consulta_collector.py --schema docs/compras-gov/comprasgov_consulta_schema.json --modulo 01-PCA

# Coleta período inteiro
python3 scripts/comprasgov_consulta_collector.py --schema docs/compras-gov/comprasgov_consulta_schema.json --data-inicio 2026-09-01 --data-fim 2026-09-30 --output resultado.json

# Resultado salvo em resultado.json
```

### Integração com Cron
```bash
# Deploy Edge Function
supabase functions deploy sync-comprasgov-consulta

# Cron dispara POST /sync-comprasgov-consulta a cada dia
# (configurar em next-db via admin panel ou SQL)
```

## O que Falta

**Schema JSON crítico:** File `docs/compras-gov/comprasgov_consulta_schema.json`

Você extraiu os 77 endpoints. Precisa de estrutura como:
```json
{
  "endpoints": [
    {
      "modulo": "01-PCA",
      "nome": "listar-pca",
      "metodo": "GET",
      "path": "/pca",
      "parametros": {
        "pagina": { "tipo": "number", "obrigatorio": false },
        "pageSize": { "tipo": "number", "obrigatorio": false }
      },
      "temPaginacao": true,
      "temVarianteCsv": false,
      "descricao": "Lista todas as PCAs (Pesquisas de Catálogos de Aluguéis)"
    },
    ...
  ]
}
```

## Dependências Python
```bash
pip3 install httpx asyncio
```

(Já incluído em requirements.txt? Criar se necessário)

## Próximo Passo

**Compartilha o JSON!** Uma vez que temos:
1. Schema JSON → coloca em `docs/compras-gov/comprasgov_consulta_schema.json`
2. Run fase 1 tests: `python3 scripts/comprasgov_consulta_collector.py --modulo 01-PCA`
3. Validar estrutura dos dados
4. Expandir para Fase 2 (persistência)

---

**Criado em:** 2026-09-20 20:36 GMT-3  
**Responsável:** Marcelo  
**Branch:** feat/consulta-comprasgov-api

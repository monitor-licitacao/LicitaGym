# Plano — probe segmentado e carga incremental do PCA

> Status: **Fase 1–2 em implementação** (2026-09-19). Complementa
> [contract-matrix.md](./contract-matrix.md) e [cruzamentos.md](./cruzamentos.md).

Ver PR [#3](https://github.com/monitor-licitacao/LicitaGym/pull/3) para o texto completo e contexto da execução real que originou o plano.

## Resumo executivo

| | endpoint | filtro de classe |
|---|---|---|
| **Probe Search** (secundário) | `/api/search?tipos_documento=pcaorgao` | não |
| **Probe Consulta** (primário) | `/api/consulta/v1/pca/` | `codigoClassificacaoSuperior=7830` |
| **Carga** | `/api/consulta/v1/pca/` | sim |

## Fases

1. **Correções pontuais** — `total_indexado`, fuso UTC em timestamps naive, rename amostra, validação de ordenação Search.
2. **Probe segmentado** — `totalRegistros` por classe na âncora; Search permanece sinal secundário.
3. **Incremental** — `fetchPcaAtualizacao` (`dataInicio`/`dataFim`); PR separado.

## Implementação

| Item | Arquivo |
|------|---------|
| Fase 1–2 | `_shared/pncp/search-client.ts`, `period-anchor.ts`, `consulta-client.ts`, `sync-pncp-pca/index.ts` |

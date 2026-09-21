# Plano ONNX / TensorRT - Agente Juridico LicitaGym

**Decisao (2026-09-21):** nao migrar o sistema *para* Nsight Deep Learning Designer.
Nsight = lab de profiling. Runtime-alvo = **ONNX -> TensorRT (FP16)** no hot path de embeddings.

## Fase 0 - Verdade operacional
- [x] Remover TF / EmbeddingBackend / benchmark / baseline RTX 3050
  - CPU batch1 p50=54,2 ms; GPU torch batch1 p50~7,6-8,3 ms

## Fase 1 - Contrato e limpeza
- [x] pgvector RPC + SQL Supabase aplicado

## Fase 2 - ONNX FP16 / ORT CUDA
- [x] Export O4 + paridade PASS
- [x] ORT CUDA batch1 p50~11,3 ms (pior que torch em batch1)

## Fase 3 - TensorRT EP
- [x] onnxruntime-gpu 1.22.0 + tensorrt-cu12 10.9 + nvidia cudnn/cublas no PATH (`ensure_ort_gpu_dll_path`)
- [x] Backend `LICITAGYM_EMBEDDING_BACKEND=trt` (TensorrtExecutionProvider, FP16, engine cache em `models/trt_cache`)
- [x] Usa `onnx/model.onnx` (nao O4) — TRT prefere ONNX base
- [x] Paridade torch vs TRT: self-cosine min **0.999989**, corr **0.999989** (PASS)
- [x] Benchmark RTX 3050 (2026-09-21, apos warmup):
  - **TRT batch1: p50 3,40 ms / p95 4,55 ms** (~2,4x vs torch historico ~8 ms)
  - TRT batch8: p50 7,57 ms (p95 alto na 1a vez por rebuild de shape)
- Nota: 1o encode apos cold start pode levar dezenas de segundos (build engine); depois o cache acelera. Default de runtime: **trt** (override com `LICITAGYM_EMBEDDING_BACKEND=torch` ou `onnx`).

## Fase 4 - Producao
- [x] Warmup na API (`criar_api` lifespan) + `/health` `/ready` `/metrics`
- [x] Scripts: `scripts/warmup_embeddings.py`, `scripts/smoke_fase4.py`, `scripts/write_artifact_manifest.py`
- [x] Versionamento: `artifacts/MANIFEST.json` (sm86 / RTX 3050; onnx + trt_cache)
- [x] `Dockerfile.gpu` + `docker-compose.gpu.yml` + `DEPLOY.md` (esqueleto Linux GPU; nao buildado neste laptop Windows)
- [x] Smoke go/no-go TRT (2026-09-21 13:36 BRT): PASS — cosine min 0.999997, p50 4.22 ms (limiares 0.99 / 6 ms)
- [ ] INT8: adiado ate golden set
- [x] Default production = `trt` (2026-09-21)

## Bastao atual
**Bastao:** Fases 0-4 entregues. Default embeddings = **trt**.
Notion: plano local em `PLAN.md` (integracao Notion 404 / collection not found).

## Pos-fase (2026-09-21)
- [x] HNSW no Supabase (supabase_hnsw_migration.sql) — aplicar no SQL Editor
- [x] UI Documentos com artigo; boost habilitação Arts. 62–70
- [x] Chunks Lei 14.133 em legislacao_embeddings



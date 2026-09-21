# Deploy — Agente Juridico ML (Fase 4)

## Runtime default

- Default: **trt**. Override: `LICITAGYM_EMBEDDING_BACKEND=torch` ou `onnx`.
- API: `uvicorn agente:app --host 0.0.0.0 --port 8000`
- Startup faz **warmup** (load + 3 encodes). Cold start TRT pode levar dezenas de segundos.

## Endpoints

| Metodo | Path | Uso |
|--------|------|-----|
| GET | `/health` | liveness + backend/provider |
| GET | `/ready` | 200 so apos warmup |
| GET | `/metrics` | p50/p95 encode recentes |
| POST | `/consultar` | consulta juridica |

## Artefatos

```powershell
.\.venv\Scripts\python.exe scripts\export_onnx.py
.\.venv\Scripts\python.exe scripts\warmup_embeddings.py --backend trt
.\.venv\Scripts\python.exe scripts\write_artifact_manifest.py
.\.venv\Scripts\python.exe scripts\smoke_fase4.py
```

- ONNX bundle: `models/onnx/`
- TRT engine cache: `models/trt_cache/` (**nao portavel** entre GPU SM / versoes ORT/TRT)
- Manifest: `artifacts/MANIFEST.json`

## Docker GPU (Linux)

```bash
docker compose -f docker-compose.gpu.yml up --build
curl -s localhost:8000/ready
curl -s localhost:8000/metrics
```

Requer NVIDIA Container Toolkit. No container o engine TRT e reconstruido no 1o warmup se o SM diferir.

## Go / no-go

`scripts/smoke_fase4.py` exige:

- cosseno torch vs target >= 0.99
- p50 encode <= 6 ms (ajustavel via `LICITAGYM_SMOKE_MAX_P50_MS`)

INT8 fica fora do caminho critico ate haver golden set juridico (ver PLAN.md).

## Env

| Var | Default | Descricao |
|-----|---------|-----------|
| `LICITAGYM_EMBEDDING_BACKEND` | `trt` | `torch` / `onnx` / `trt` |
| `LICITAGYM_ONNX_DIR` | `models/onnx` | bundle ST+ONNX |
| `LICITAGYM_TRT_CACHE` | `models/trt_cache` | cache engine |
| `LICITAGYM_ONNX_FILE` | `onnx/model.onnx` | arquivo ONNX (TRT) |

## Docker Desktop (Windows + WSL2 GPU)

Testado no VectraCargo (RTX 3050, Docker Desktop 4.87, runtime nvidia):

```powershell
docker build -f Dockerfile.gpu -t agente-juridico-ml:gpu .
docker run -d --gpus all --name agente-juridico-ml -p 8000:8000 `
  -e LICITAGYM_EMBEDDING_BACKEND=trt `
  -v C:\Users\marce\licitagym\docs\agente-juridico-ml/models/onnx:/app/models/onnx:ro `
  -v agente-juridico-ml_trt_cache:/app/models/trt_cache `
  agente-juridico-ml:gpu
curl http://127.0.0.1:8000/ready
```

Imagem de trabalho atual: `agente-juridico-ml:gpu` (inclui requests, optimum, ST 5.6, ORT-GPU 1.22).
Import Linux: use `from PyPDF2 import PdfReader` (case-sensitive).


## UI de consulta

Abra http://127.0.0.1:8000/ — chat estático em `static/index.html` (POST `/consultar`).
Swagger continua em `/docs`.

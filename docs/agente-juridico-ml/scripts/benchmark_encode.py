#!/usr/bin/env python3
"""
Baseline de latência de embeddings (Fase 0).

Uso:
  cd docs/agente-juridico-ml
  python scripts/benchmark_encode.py
  LICITAGYM_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 \\
    python scripts/benchmark_encode.py --runs 20 --batch 8

A 1ª execução baixa pesos do Hugging Face (pode demorar).
Não exige GPU; reporta device se torch estiver disponível.
"""

from __future__ import annotations

import argparse
import os
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from modelo_ml import ModeloJuridicoML  # noqa: E402


SAMPLES = [
    "Quais os requisitos para dispensa de licitação?",
    "Lei 14.133 de 2021 artigo 75 compra direta",
    "Normas técnicas ABNT para equipamentos de academia",
    "Impugnação ao edital de pregão eletrônico",
    "Habilitação jurídica e técnica do licitante",
]


def percentile(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return float("nan")
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark encode embeddings LicitaGym")
    parser.add_argument("--runs", type=int, default=10, help="Medições após warmup")
    parser.add_argument("--warmup", type=int, default=2)
    parser.add_argument("--batch", type=int, default=1, help="Tamanho do lote")
    parser.add_argument(
        "--model",
        default=os.getenv("LICITAGYM_EMBEDDING_MODEL"),
        help="Override do modelo ST",
    )
    args = parser.parse_args()

    model_name = args.model or "pierreguillou/bert-base-cased-squad-v1.1-portuguese"
    texts = (SAMPLES * ((args.batch // len(SAMPLES)) + 1))[: args.batch]

    print(f"model={model_name}")
    print(f"batch={args.batch} warmup={args.warmup} runs={args.runs}")

    try:
        import torch

        print(f"torch={torch.__version__} cuda={torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"gpu={torch.cuda.get_device_name(0)}")
    except Exception as e:
        print(f"torch: indisponível ({e})")

    modelo = ModeloJuridicoML(modelo_nome=model_name)
    t0 = time.perf_counter()
    modelo.carregar_modelo()
    print(f"load_s={(time.perf_counter() - t0):.3f}")
    dim = modelo.embedding_backend.dimension if modelo.embedding_backend else None
    print(f"dim={dim} normalize={modelo.normalize_embeddings}")

    for _ in range(args.warmup):
        modelo.gerar_embeddings_lote(texts)

    times_ms: list[float] = []
    for _ in range(args.runs):
        t1 = time.perf_counter()
        modelo.gerar_embeddings_lote(texts)
        times_ms.append((time.perf_counter() - t1) * 1000.0)

    times_ms.sort()
    print(f"p50_ms={percentile(times_ms, 50):.2f}")
    print(f"p95_ms={percentile(times_ms, 95):.2f}")
    print(f"mean_ms={statistics.mean(times_ms):.2f}")
    print(f"min_ms={times_ms[0]:.2f} max_ms={times_ms[-1]:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

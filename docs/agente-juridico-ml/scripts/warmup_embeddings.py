#!/usr/bin/env python3
"""Warmup do backend de embeddings (TRT/ONNX/torch) — Fase 4."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from embeddings_backend import create_default_backend

WARMUP = [
    "warmup licitacao lei 14133",
    "dispensa de licitacao artigo 75",
    "pregao eletronico equipamentos academia",
]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--backend", default=os.getenv("LICITAGYM_EMBEDDING_BACKEND", "trt"))
    p.add_argument("--runs", type=int, default=3)
    args = p.parse_args()

    t0 = time.perf_counter()
    backend = create_default_backend(backend=args.backend)
    backend.load()
    load_s = time.perf_counter() - t0

    times = []
    for i in range(args.runs):
        t1 = time.perf_counter()
        emb = backend.encode([WARMUP[i % len(WARMUP)]])
        times.append((time.perf_counter() - t1) * 1000.0)
        dim = emb.shape[1]

    report = {
        "backend": args.backend,
        "provider": getattr(backend, "provider", "torch"),
        "dim": int(dim),
        "load_s": round(load_s, 3),
        "encode_ms": [round(x, 2) for x in times],
        "encode_ms_min_after_first": round(min(times[1:]), 2) if len(times) > 1 else round(times[0], 2),
    }
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

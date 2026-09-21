#!/usr/bin/env python3
"""Go/no-go Fase 4: paridade + latencia TRT vs torch."""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from embeddings_backend import SentenceTransformerBackend, create_default_backend

SAMPLES = [
    "Quais os requisitos para dispensa de licitacao?",
    "Lei 14.133 de 2021 artigo 75 compra direta",
    "Normas tecnicas ABNT para equipamentos de academia",
    "Impugnacao ao edital de pregao eletronico",
]

# Thresholds (RTX 3050 laptop baseline)
MAX_P50_MS = float(os.getenv("LICITAGYM_SMOKE_MAX_P50_MS", "6.0"))
MIN_COSINE = float(os.getenv("LICITAGYM_SMOKE_MIN_COSINE", "0.99"))


def cosine(a, b):
    a = a.astype(np.float64)
    b = b.astype(np.float64)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))


def p50(vals):
    s = sorted(vals)
    return s[len(s) // 2]


def main() -> int:
    target = os.getenv("LICITAGYM_EMBEDDING_BACKEND", "trt")
    st = SentenceTransformerBackend()
    st.load()
    tgt = create_default_backend(backend=target)
    tgt.load()

    # warmup
    for _ in range(2):
        tgt.encode([SAMPLES[0]])

    times = []
    sims = []
    for text in SAMPLES * 3:
        a = st.encode([text])[0]
        t0 = time.perf_counter()
        b = tgt.encode([text])[0]
        times.append((time.perf_counter() - t0) * 1000.0)
        sims.append(cosine(a, b))

    report = {
        "target_backend": target,
        "provider": getattr(tgt, "provider", target),
        "self_cosine_min": min(sims),
        "p50_ms": round(p50(times), 2),
        "mean_ms": round(float(np.mean(times)), 2),
        "thresholds": {"min_cosine": MIN_COSINE, "max_p50_ms": MAX_P50_MS},
        "pass_parity": min(sims) >= MIN_COSINE,
        "pass_latency": p50(times) <= MAX_P50_MS,
    }
    report["pass"] = report["pass_parity"] and report["pass_latency"]
    print(json.dumps(report, indent=2))
    print("PASS" if report["pass"] else "FAIL")
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

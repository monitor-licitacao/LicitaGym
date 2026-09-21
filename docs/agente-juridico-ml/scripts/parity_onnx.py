#!/usr/bin/env python3
"""Comparar embeddings PyTorch ST vs ONNX (ORT) — paridade Fase 2."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from embeddings_backend import (
    DEFAULT_EMBEDDING_MODEL,
    SentenceTransformerBackend,
    OrtEmbeddingBackend,
)

SAMPLES = [
    "Quais os requisitos para dispensa de licitacao?",
    "Lei 14.133 de 2021 artigo 75 compra direta",
    "Normas tecnicas ABNT para equipamentos de academia",
    "Impugnacao ao edital de pregao eletronico",
    "Habilitacao juridica e tecnica do licitante",
    "A licitacao deve seguir o principio da isonomia",
    "E necessario garantir igualdade entre os licitantes",
    "Pregao eletronico para aquisicao de esteira ergometrica",
]


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    a = a.astype(np.float64)
    b = b.astype(np.float64)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))


def sim_matrix(emb: np.ndarray) -> np.ndarray:
    emb = emb.astype(np.float64)
    norms = np.linalg.norm(emb, axis=1, keepdims=True) + 1e-12
    n = emb / norms
    return n @ n.T


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=os.getenv("LICITAGYM_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL))
    parser.add_argument("--onnx-dir", default=str(ROOT / "models" / "onnx"))
    parser.add_argument("--file-name", default=None)
    args = parser.parse_args()

    onnx_dir = Path(args.onnx_dir)
    file_name = args.file_name
    meta_path = onnx_dir / "export_meta.json"
    if file_name is None and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        file_name = meta.get("preferred_file")

    st = SentenceTransformerBackend(model_name=args.model, normalize=True)
    st.load()
    ort = OrtEmbeddingBackend(
        onnx_dir=str(onnx_dir),
        file_name=file_name,
        model_name=args.model,
        normalize=True,
        provider="CUDAExecutionProvider",
    )
    ort.load()

    emb_st = st.encode(SAMPLES)
    emb_ort = ort.encode(SAMPLES)
    pair_sims = [cosine(emb_st[i], emb_ort[i]) for i in range(len(SAMPLES))]
    m_st = sim_matrix(emb_st)
    m_ort = sim_matrix(emb_ort)
    corr = float(np.corrcoef(m_st.ravel(), m_ort.ravel())[0, 1])
    max_abs = float(np.max(np.abs(m_st - m_ort)))

    report = {
        "n": len(SAMPLES),
        "dim_st": int(emb_st.shape[1]),
        "dim_ort": int(emb_ort.shape[1]),
        "self_cosine_min": min(pair_sims),
        "self_cosine_mean": float(np.mean(pair_sims)),
        "self_cosine_max": max(pair_sims),
        "pairwise_corr": corr,
        "pairwise_max_abs_diff": max_abs,
        "pass_self_cosine_gt_0_99": min(pair_sims) > 0.99,
        "pass_corr_gt_0_99": corr > 0.99,
    }
    print(json.dumps(report, indent=2))
    ok = report["pass_self_cosine_gt_0_99"] and report["pass_corr_gt_0_99"]
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

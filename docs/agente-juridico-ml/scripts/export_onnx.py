#!/usr/bin/env python3
"""Fase 2 — export SentenceTransformers → ONNX O4 (FP16, GPU)."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from embeddings_backend import DEFAULT_EMBEDDING_MODEL


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=os.getenv("LICITAGYM_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL))
    parser.add_argument("--out", default=str(ROOT / "models" / "onnx"))
    parser.add_argument("--opt", default="O4", choices=["O1", "O2", "O3", "O4"])
    args = parser.parse_args()

    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)

    from sentence_transformers import SentenceTransformer, export_optimized_onnx_model

    print(f"loading backend=onnx model={args.model}")
    model = SentenceTransformer(args.model, backend="onnx")
    print(f"saving full ST bundle -> {out}")
    model.save(str(out))
    print(f"exporting optimization={args.opt} -> {out}")
    export_optimized_onnx_model(model, args.opt, str(out))

    onnx_files = sorted(out.rglob("*.onnx"))
    preferred = None
    for p in onnx_files:
        if args.opt.lower() in p.name.lower() or "o4" in p.name.lower():
            preferred = str(p.relative_to(out)).replace("\\", "/")
            break
    if preferred is None and onnx_files:
        preferred = str(onnx_files[-1].relative_to(out)).replace("\\", "/")

    meta = {
        "source_model": args.model,
        "optimization": args.opt,
        "out_dir": str(out.resolve()),
        "onnx_files": [str(p.relative_to(out)).replace("\\", "/") for p in onnx_files],
        "preferred_file": preferred,
        "has_config": (out / "config.json").exists() or (out / "config_sentence_transformers.json").exists(),
        "has_modules": (out / "modules.json").exists(),
    }
    (out / "export_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta, indent=2))
    if not meta["has_modules"]:
        print("WARN: modules.json missing — load may fail")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Versiona artefatos ONNX + TRT cache (Fase 4)."""
from __future__ import annotations

import hashlib
import json
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha256(path: Path, limit: int = 32 * 1024 * 1024) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        remaining = limit
        while remaining > 0:
            chunk = f.read(min(1024 * 1024, remaining))
            if not chunk:
                break
            h.update(chunk)
            remaining -= len(chunk)
    return h.hexdigest()


def main() -> int:
    onnx_dir = ROOT / "models" / "onnx"
    trt_dir = ROOT / "models" / "trt_cache"
    out_dir = ROOT / "artifacts"
    out_dir.mkdir(exist_ok=True)

    files = []
    for p in sorted(onnx_dir.rglob("*")):
        if p.is_file() and p.suffix.lower() in {".onnx", ".json"} or p.name in {
            "modules.json", "config.json", "tokenizer.json", "vocab.txt",
            "config_sentence_transformers.json", "sentence_bert_config.json",
            "export_meta.json", "special_tokens_map.json", "tokenizer_config.json",
        }:
            files.append({
                "path": str(p.relative_to(ROOT)).replace("\\", "/"),
                "bytes": p.stat().st_size,
                "sha256_prefix": sha256(p)[:16],
            })
    for p in sorted(trt_dir.glob("*")) if trt_dir.exists() else []:
        if p.is_file():
            files.append({
                "path": str(p.relative_to(ROOT)).replace("\\", "/"),
                "bytes": p.stat().st_size,
                "sha256_prefix": sha256(p)[:16],
            })

    gpu = None
    try:
        import torch
        if torch.cuda.is_available():
            gpu = torch.cuda.get_device_name(0)
            sm = torch.cuda.get_device_capability(0)
            sm_str = f"sm{sm[0]}{sm[1]}"
        else:
            sm_str = None
    except Exception:
        sm_str = None

    try:
        import onnxruntime as ort
        ort_ver = ort.__version__
        providers = ort.get_available_providers()
    except Exception:
        ort_ver = None
        providers = []

    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "host": platform.node(),
        "platform": platform.platform(),
        "gpu": gpu,
        "sm": sm_str,
        "ort_version": ort_ver,
        "ort_providers": providers,
        "files": files,
        "note": "TRT engine is not portable across GPU SM / ORT / TensorRT versions.",
    }
    out = out_dir / "MANIFEST.json"
    out.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(out)
    print(json.dumps({"files": len(files), "sm": sm_str, "gpu": gpu}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

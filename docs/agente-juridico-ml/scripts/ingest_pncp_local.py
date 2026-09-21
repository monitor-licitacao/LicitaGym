#!/usr/bin/env python3
"""Ingerir HTML local (leis_raw/) com fallback de encoding latin-1/cp1252."""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

RAW_DIR = ROOT / "leis_raw"
REPORT = ROOT / "artifacts" / "pncp_local_ingest_report.json"


def main() -> int:
    from agente import AgenteJuridico
    from ingestor import ParserDocumento

    agente = AgenteJuridico()
    results = []
    for path in sorted(RAW_DIR.glob("*")):
        if path.suffix.lower() not in {".htm", ".html", ".pdf", ".docx"}:
            continue
        try:
            # encoding exercised for html via ParserDocumento.read_text_file
            if path.suffix.lower() in {".htm", ".html"}:
                _ = ParserDocumento.read_text_file(str(path))
            res = agente.ingerir_documento(str(path))
            results.append({"file": path.name, "ok": bool(res), "id": (res or {}).get("id")})
            print("OK" if res else "FAIL", path.name)
        except Exception as e:
            msg = str(e)
            if "eyJ" in msg:
                msg = "[redacted]"
            results.append({"file": path.name, "ok": False, "error": msg[:300]})
            print("FAIL", path.name, msg[:200])
    report = {"generated_at": datetime.now().isoformat(), "results": results}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

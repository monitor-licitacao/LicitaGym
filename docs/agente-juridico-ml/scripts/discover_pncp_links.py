#!/usr/bin/env python3
"""Descobre URLs de documentos nas listagens PNCP e grava artifacts/pncp_links.json."""

from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "pncp_links.json"

UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}
API_UA = {**UA, "Accept": "application/json"}

LISTS = [
    ("lei", "https://www.gov.br/pncp/pt-br/pncp/legislacao/leis"),
    ("decreto", "https://www.gov.br/pncp/pt-br/pncp/legislacao/decretos"),
    ("portaria", "https://www.gov.br/pncp/pt-br/pncp/legislacao/portarias"),
    ("resolucao", "https://www.gov.br/pncp/pt-br/pncp/legislacao/resolucoes"),
    ("portaria", "https://www.gov.br/pncp/pt-br/pncp/legislacao/portarias-revogadas"),
]

EXTERNAL_RE = re.compile(
    r"planalto\.gov|in\.gov\.br|imprensa\.nacional|\.pdf(?:$|\?)|@@download|\.htm",
    re.I,
)
SHARE_RE = re.compile(r"whatsapp|twitter|facebook|linkedin|shareArticle|x\.com", re.I)
SKIP_TITLES = re.compile(
    r"^(Portarias|Portarias Revogadas|Resolu[cç][oõ]es|Leis|Decretos)$", re.I
)


def get_html(url: str) -> str:
    r = requests.get(url, headers=UA, timeout=45)
    r.raise_for_status()
    return r.text


def api_items(list_url: str):
    path = list_url.split("www.gov.br/pncp/", 1)[1]
    api = f"https://www.gov.br/pncp/++api++/{path}"
    r = requests.get(api, headers=API_UA, timeout=45)
    r.raise_for_status()
    return r.json().get("items") or []


def listing_external(list_url: str, html: str):
    soup = BeautifulSoup(html, "lxml")
    out = []
    for a in soup.find_all("a", href=True):
        full = urljoin(list_url, a["href"])
        if SHARE_RE.search(full) or not EXTERNAL_RE.search(full):
            continue
        title = re.sub(r"\s+", " ", a.get_text(" ", strip=True))[:250]
        out.append({"title": title or full, "url": full})
    seen, uniq = set(), []
    for i in out:
        if i["url"] not in seen:
            seen.add(i["url"])
            uniq.append(i)
    return uniq


def resolve_detail(detail_url: str):
    html = get_html(detail_url)
    soup = BeautifulSoup(html, "lxml")
    candidates = []
    for a in soup.find_all("a", href=True):
        full = urljoin(detail_url, a["href"])
        if SHARE_RE.search(full):
            continue
        if EXTERNAL_RE.search(full):
            candidates.append(full)
    prefer = [u for u in candidates if re.search(r"planalto|in\.gov|\.pdf", u, re.I)]
    dou = prefer[0] if prefer else (candidates[0] if candidates else None)
    main = soup.select_one("main") or soup.select_one("#content-core") or soup.body
    text = main.get_text(" ", strip=True) if main else ""
    has_art = bool(re.search(r"Art\.?\s*1", text, re.I))
    ingest = detail_url if has_art else (dou or detail_url)
    return {"ingest_url": ingest, "dou_url": dou, "has_fulltext": has_art}


def main() -> int:
    results = []
    for tipo, list_url in LISTS:
        revogada = "portarias-revogadas" in list_url
        html = get_html(list_url)
        ext = listing_external(list_url, html)
        try:
            items = api_items(list_url)
        except Exception:
            items = []

        if ext and tipo in ("lei", "decreto"):
            for e in ext:
                entry = {
                    "tipo_hint": tipo,
                    "title": e["title"],
                    "url": e["url"],
                    "source_list_url": list_url,
                }
                if revogada:
                    entry["revogada"] = True
                results.append(entry)
            continue

        for it in items:
            title = (it.get("title") or "").strip()
            detail = it.get("@id") or ""
            if SKIP_TITLES.match(title) or not detail:
                continue
            if detail.rstrip("/").endswith(("/portarias-vigentes", "/portarias")):
                continue
            info = resolve_detail(detail)
            entry = {
                "tipo_hint": tipo,
                "title": title,
                "url": info["ingest_url"],
                "source_list_url": list_url,
                "detail_page_url": detail,
            }
            if info.get("dou_url"):
                entry["dou_url"] = info["dou_url"]
            if revogada:
                entry["revogada"] = True
            results.append(entry)

    seen, final = set(), []
    for r in results:
        if r["url"] in seen:
            continue
        seen.add(r["url"])
        final.append(r)

    out = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "counts_by_tipo_hint": dict(Counter(r["tipo_hint"] for r in final)),
        "counts_by_list": dict(
            Counter(r["source_list_url"].rstrip("/").split("/")[-1] for r in final)
        ),
        "revogadas": sum(1 for r in final if r.get("revogada")),
        "total": len(final),
        "links": final,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} total={len(final)} {out['counts_by_list']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

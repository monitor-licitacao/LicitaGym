#!/usr/bin/env python3
"""SEC-R1 Phase 1B Edge auth smoke — no secrets printed."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://ifaiagegyicjzlpskafh.supabase.co/functions/v1"
ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent / "_r1_edge_smoke_results.json"

def _load_anon() -> str:
    env_anon = os.environ.get("SUPABASE_ANON_KEY", "").strip()
    if env_anon:
        return env_anon
    for candidate in (
        ROOT / ".env.local",
        ROOT / ".env",
        ROOT / "supabase" / ".env.local",
        ROOT / "supabase" / ".env",
    ):
        if not candidate.exists():
            continue
        for line in candidate.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            if k.strip() == "SUPABASE_ANON_KEY":
                return v.strip().strip('"').strip("'")
    return ""


ANON = _load_anon()
if not ANON:
    print("FAIL: SUPABASE_ANON_KEY missing", file=sys.stderr)
    sys.exit(2)


def load_cron_secret() -> str:
    env_path = ROOT / "supabase" / ".env.functions.local"
    for line in env_path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        if k.strip() == "SYNC_CRON_SECRET":
            return v.strip().strip('"').strip("'")
    raise RuntimeError("SYNC_CRON_SECRET not found")


def call(
    method: str,
    path: str,
    *,
    authorization: str | None,
    body: dict | None = None,
    extra_headers: dict | None = None,
) -> dict:
    url = f"{BASE}/{path.lstrip('/')}"
    headers = {
        "apikey": ANON,
        "Content-Type": "application/json",
    }
    if authorization is not None:
        headers["Authorization"] = authorization
    if extra_headers:
        headers.update(extra_headers)
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                parsed = {"_raw": raw[:500]}
            return {
                "status": resp.status,
                "body": parsed,
                "error_field": parsed.get("error") if isinstance(parsed, dict) else None,
            }
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"_raw": raw[:500]}
        return {
            "status": e.code,
            "body": parsed,
            "error_field": parsed.get("error") if isinstance(parsed, dict) else None,
        }
    except Exception as e:  # noqa: BLE001 — surface transport failures as ACTUAL
        return {"status": None, "body": {"error": type(e).__name__}, "error_field": str(e)[:200]}


def expect_reject(result: dict, label: str) -> dict:
    ok = result.get("status") in (401, 403)
    return {
        "case": label,
        "status": result.get("status"),
        "error": result.get("error_field"),
        "PASS": ok,
        "note": "rejected" if ok else "UNEXPECTED — not rejected",
    }


def main() -> int:
    cron = load_cron_secret()
    results: list[dict] = []
    idem_probe_keys: list[str] = []

    fns_002 = [
        "api-pncp-pca",
        "api-pncp-contratacoes",
        "api-pncp-legislacao",
    ]

    # --- SEC-EDGE-002 ---
    for fn in fns_002:
        # missing Authorization
        r = call("POST", fn, authorization=None, body={})
        results.append(expect_reject(r, f"EDGE-002 {fn} missing Authorization"))

        # arbitrary Bearer
        probe = f"r1-smoke-arb-{fn}"
        idem_probe_keys.append(probe)
        r = call(
            "POST",
            fn,
            authorization="Bearer totally-arbitrary-not-a-secret",
            body={},
            extra_headers={"Idempotency-Key": probe},
        )
        results.append(expect_reject(r, f"EDGE-002 {fn} arbitrary Bearer"))

        # invalid cron secret
        probe2 = f"r1-smoke-badcron-{fn}"
        idem_probe_keys.append(probe2)
        r = call(
            "POST",
            fn,
            authorization="Bearer invalid-cron-secret-r1-smoke",
            body={},
            extra_headers={"Idempotency-Key": probe2},
        )
        results.append(expect_reject(r, f"EDGE-002 {fn} invalid cron secret"))

        # legitimate cron — auth boundary only: omit Idempotency-Key → expect 400 after auth
        r = call(
            "POST",
            fn,
            authorization=f"Bearer {cron}",
            body={"_r1_smoke": True, "dry_run_marker": True},
        )
        status = r.get("status")
        err = (r.get("error_field") or "")
        # Auth passed if we get 400 Idempotency-Key required (not 401)
        passed = status == 400 and "Idempotency-Key" in str(err)
        results.append(
            {
                "case": f"EDGE-002 {fn} legitimate cron auth boundary (no sync)",
                "status": status,
                "error": err,
                "PASS": passed,
                "note": "auth OK, stopped before sync"
                if passed
                else "UNEXPECTED — expected 400 Idempotency-Key after auth",
            }
        )

    # --- SEC-EDGE-004 ---
    # missing auth
    r = call(
        "GET",
        "api-pncp-legislacao?documento_id=00000000-0000-0000-0000-000000000001&signed_url=true",
        authorization=None,
    )
    results.append(expect_reject(r, "EDGE-004 signed_url missing auth"))

    # invalid JWT
    r = call(
        "GET",
        "api-pncp-legislacao?documento_id=00000000-0000-0000-0000-000000000001&signed_url=true",
        authorization="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.sig",
    )
    results.append(expect_reject(r, "EDGE-004 signed_url invalid JWT"))

    # valid authorized JWT positive path
    results.append(
        {
            "case": "EDGE-004 signed_url valid authorized JWT",
            "status": None,
            "error": None,
            "PASS": None,
            "note": "NOT RUN — SAFE FIXTURE UNAVAILABLE",
        }
    )

    # --- SEC-EDGE-003 ---
    # unauthenticated
    r = call(
        "POST",
        "calculate-distance-webrouter",
        authorization=None,
        body={"origem": {"lat": -23.5, "lng": -46.6}, "destino": {"lat": -23.6, "lng": -46.7}},
    )
    results.append(expect_reject(r, "EDGE-003 WebRouter unauthenticated"))

    # arbitrary destination fields in payload → should 401 first (no auth) already covered;
    # with invalid cron: reject auth
    r = call(
        "POST",
        "calculate-distance-webrouter",
        authorization="Bearer arbitrary-webrouter-token",
        body={"url": "https://evil.example/x", "endpoint": "https://evil.example"},
    )
    results.append(expect_reject(r, "EDGE-003 WebRouter arbitrary Bearer + forbidden keys"))

    # legitimate cron + forbidden destination keys → auth OK then 400 payload reject
    r = call(
        "POST",
        "calculate-distance-webrouter",
        authorization=f"Bearer {cron}",
        body={"url": "https://evil.example/x", "origem": {"lat": -23.5, "lng": -46.6}},
    )
    status = r.get("status")
    err = str(r.get("error_field") or "")
    passed = status == 400 and ("não permitidos" in err.lower() or "nao permitidos" in err.lower() or "permitidos" in err.lower())
    # also accept generic Portuguese message from validateWebRouterPayload
    if status == 400 and "permit" in err.lower():
        passed = True
    results.append(
        {
            "case": "EDGE-003 WebRouter authenticated + arbitrary destination keys",
            "status": status,
            "error": err,
            "PASS": passed,
            "note": "payload rejected after auth" if passed else "UNEXPECTED",
        }
    )

    # authenticated + allowed operation — may hit real WebRouter if WEBROUTER_API set.
    # Prefer NOT RUN if we cannot prove fixture; use minimal payload that fails validation
    # early OR mark NOT RUN for positive provider path to avoid unintended external call cost.
    results.append(
        {
            "case": "EDGE-003 WebRouter authenticated + permitted operation (provider)",
            "status": None,
            "error": None,
            "PASS": None,
            "note": "NOT RUN — avoid live provider mutation/cost; auth+payload reject covered",
        }
    )

    # redirect upstream: cannot safely probe without controlling provider; unit covered.
    results.append(
        {
            "case": "EDGE-003 WebRouter redirect upstream not followed",
            "status": None,
            "error": None,
            "PASS": None,
            "note": "NOT RUN — requires controlled upstream; code has redirect:error; no localhost/RFC1918 probe",
        }
    )

    summary = {
        "project": "ifaiagegyicjzlpskafh",
        "base": BASE,
        "idempotency_probe_keys": idem_probe_keys,
        "results": results,
        "pass_count": sum(1 for x in results if x.get("PASS") is True),
        "fail_count": sum(1 for x in results if x.get("PASS") is False),
        "not_run_count": sum(1 for x in results if x.get("PASS") is None),
    }
    OUT.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    # Human-readable (no secrets)
    print(f"PASS={summary['pass_count']} FAIL={summary['fail_count']} NOT_RUN={summary['not_run_count']}")
    for x in results:
        flag = {True: "PASS", False: "FAIL", None: "NOT_RUN"}[x.get("PASS")]
        print(f"{flag}\t{x['case']}\tstatus={x.get('status')}\tnote={x.get('note')}\terr={x.get('error')}")
    print(f"WROTE {OUT}")
    return 0 if summary["fail_count"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

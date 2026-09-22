"""Tests for scripts/lib/payload_hash.py and Edge parity."""

import hashlib
import json
import pytest

from scripts.lib.payload_hash import (
    stable_stringify,
    compute_payload_hash,
    compute_hash,
    VOLATILE_KEYS,
)


def test_stable_stringify_primitives():
    assert stable_stringify(None) == "null"
    assert stable_stringify(True) == "true"
    assert stable_stringify(False) == "false"
    assert stable_stringify(123) == "123"
    assert stable_stringify("texto") == '"texto"'


def test_stable_stringify_dict_sorting():
    obj1 = {"b": 2, "a": 1, "c": 3}
    obj2 = {"c": 3, "a": 1, "b": 2}
    assert stable_stringify(obj1) == '{"a":1,"b":2,"c":3}'
    assert stable_stringify(obj1) == stable_stringify(obj2)


def test_stable_stringify_strips_volatile_keys():
    obj = {
        "codigoGrupo": 78,
        "dataHoraAtualizacao": "2026-09-20T12:00:00Z",
        "last_synced_at": "2026-09-21T00:00:00Z",
        "sync_timestamp": "2026-09-21T01:00:00Z",
        "nomeGrupo": "FITNESS",
    }
    expected = '{"codigoGrupo":78,"nomeGrupo":"FITNESS"}'
    assert stable_stringify(obj) == expected


def test_stable_stringify_nested_structures():
    obj = {
        "itens": [
            {"nome": "Halter", "updated_at": "2026-09-01"},
            {"nome": "Anilha", "created_at": "2026-09-01"},
        ],
        "grupo": 78,
    }
    expected = '{"grupo":78,"itens":[{"nome":"Halter"},{"nome":"Anilha"}]}'
    assert stable_stringify(obj) == expected


def test_compute_payload_hash_sha256():
    obj = {"codigoGrupo": 78, "nomeGrupo": "FITNESS"}
    serialized = '{"codigoGrupo":78,"nomeGrupo":"FITNESS"}'
    expected_sha256 = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    h = compute_payload_hash(obj)
    assert len(h) == 64
    assert h == expected_sha256
    # Check alias
    assert compute_hash(obj) == expected_sha256


def test_compute_payload_hash_idempotency_despite_volatile_timestamps():
    obj_t1 = {
        "codigo_item": 12345,
        "preco": 150.0,
        "dataHoraAtualizacao": "2026-09-20T10:00:00Z",
        "sync_timestamp": "2026-09-20T10:00:01Z",
    }
    obj_t2 = {
        "codigo_item": 12345,
        "preco": 150.0,
        "dataHoraAtualizacao": "2026-09-21T15:30:00Z",
        "sync_timestamp": "2026-09-21T15:30:02Z",
    }
    assert compute_payload_hash(obj_t1) == compute_payload_hash(obj_t2)


def test_edge_hash_parity():
    """Verify exact equivalence with TypeScript _shared/pncp/hash.ts logic.

    Edge stableStringify:
    {"codigoGrupo":78,"itens":[1,2,3],"nomeGrupo":"FITNESS"}
    """
    ts_payload = {
        "nomeGrupo": "FITNESS",
        "codigoGrupo": 78,
        "last_synced_at": "ignore-me",
        "itens": [1, 2, 3],
    }
    expected_serialized = '{"codigoGrupo":78,"itens":[1,2,3],"nomeGrupo":"FITNESS"}'
    expected_hash = hashlib.sha256(expected_serialized.encode("utf-8")).hexdigest()

    assert stable_stringify(ts_payload) == expected_serialized
    assert compute_payload_hash(ts_payload) == expected_hash

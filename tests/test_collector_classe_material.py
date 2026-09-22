"""Tests for E2: collector_classe_material.py.

Asserts callers can distinguish:
- empty successful page (HTTP 200 + empty resultado)
- transport timeout (TimeoutError -> HttpFetchError)
- HTTP 5xx error (500 -> HttpFetchError)
- HTTP 429 rate limit exhausted (-> HttpFetchError)
- Rollback compatibility mode when LICITAGYM_LEGACY_EMPTY_ON_ERROR is set
"""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_classe_material import fetch_classes, collect_classes
from scripts.lib.http_fetch import HttpFetchError, LEGACY_EMPTY_ON_ERROR_ENV
from scripts.lib.sync_state import SyncStateManager


class DummyHttpResponse:
    def __init__(self, data: dict, status: int = 200):
        self._data = json.dumps(data).encode("utf-8")
        self.status = status

    def read(self):
        return self._data

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass


def test_fetch_classes_200_success_with_records():
    payload = {
        "resultado": [{"codigoClasse": 7830, "codigoGrupo": 78, "nomeClasse": "EQUIPAMENTOS FITNESS"}],
        "totalRegistros": 1,
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_classes(codigo_grupo=78, codigo_classe=7830)
        assert res["resultado"] == payload["resultado"]
        assert len(res["resultado"]) == 1


def test_fetch_classes_200_empty_page():
    payload = {"resultado": [], "totalRegistros": 0, "paginasRestantes": 0}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_classes(codigo_grupo=78, codigo_classe=9999)
        assert res["resultado"] == []
        assert res["totalRegistros"] == 0


def test_fetch_classes_500_raises_http_fetch_error():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Server Error",
        hdrs={},
        fp=io.BytesIO(b"server error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_classes(codigo_grupo=78, codigo_classe=7830)
        assert exc_info.value.status_code == 500


def test_fetch_classes_timeout_raises_http_fetch_error():
    with patch("urllib.request.urlopen", side_effect=TimeoutError("Timed out")):
        with pytest.raises(HttpFetchError):
            fetch_classes(codigo_grupo=78, codigo_classe=7830)


def test_fetch_classes_429_exhausted_raises_http_fetch_error():
    http_429 = urllib.error.HTTPError(
        url="http://test",
        code=429,
        msg="Too Many Requests",
        hdrs={},
        fp=io.BytesIO(b"rate limited"),
    )
    with patch("urllib.request.urlopen", side_effect=http_429):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_classes(codigo_grupo=78, codigo_classe=7830)
        assert exc_info.value.status_code == 429


def test_fetch_classes_legacy_rollback_env(monkeypatch):
    monkeypatch.setenv(LEGACY_EMPTY_ON_ERROR_ENV, "1")
    http_500 = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Server Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_500):
        res = fetch_classes(codigo_grupo=78, codigo_classe=7830)
        assert res == {"resultado": []}


def test_collect_classes_partial_failure_and_resume(tmp_path):
    manager = SyncStateManager("test_collect_classes", state_dir=tmp_path)

    # First call (G72 C7220) succeeds, second call (G78 C7830) fails
    payload_g72 = {
        "resultado": [{"codigoClasse": 7220, "codigoGrupo": 72, "nomeClasse": "CLASSE 7220"}],
        "totalRegistros": 1,
    }
    http_500 = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Server Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )

    call_count = 0

    def mock_urlopen(req, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return DummyHttpResponse(payload_g72)
        raise http_500

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        with pytest.raises(HttpFetchError):
            collect_classes(sync_manager=manager, resume=False)

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "failed_partial"
    assert checkpoint.partial is True
    assert checkpoint.last_page == 1
    assert checkpoint.total_records == 1

    # Resume: G78 C7830 succeeds
    payload_g78 = {
        "resultado": [{"codigoClasse": 7830, "codigoGrupo": 78, "nomeClasse": "CLASSE 7830"}],
        "totalRegistros": 1,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload_g78)):
        res = collect_classes(sync_manager=manager, resume=True)
        assert "grupo_72" in res
        assert "grupo_78" in res
        assert len(res["grupo_72"]) == 1
        assert len(res["grupo_78"]) == 1

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "completed"
    assert checkpoint.partial is False
    assert checkpoint.last_page == 2
    assert checkpoint.total_records == 2


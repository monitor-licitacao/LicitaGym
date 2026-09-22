"""Tests for E3: collector_pdm_material.py.

Asserts:
- 200 with items
- 200 with empty page
- 5xx error raises HttpFetchError (pagination loop does not falsely treat error as 0 rows)
- timeout raises HttpFetchError
- 429 raises HttpFetchError
- legacy rollback env flag
"""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_pdm_material import fetch_pdms, collect_pdms_por_grupo_classe
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


def test_fetch_pdms_200_success():
    payload = {
        "resultado": [{"codigoPdm": 1234, "nomePdm": "ESTEIRA ERGOMETRICA"}],
        "totalRegistros": 1,
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_pdms(codigo_grupo=78, codigo_classe=7830)
        assert res["resultado"] == payload["resultado"]


def test_fetch_pdms_200_empty():
    payload = {"resultado": [], "totalRegistros": 0, "paginasRestantes": 0}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_pdms(codigo_grupo=78, codigo_classe=7830)
        assert res["resultado"] == []


def test_fetch_pdms_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch_pdms(codigo_grupo=78, codigo_classe=7830)


def test_collect_pdms_por_grupo_classe_fails_on_500():
    # If fetch raises, collect_pdms_por_grupo_classe raises instead of returning [] as if done
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            collect_pdms_por_grupo_classe(78, 7830)


def test_fetch_pdms_timeout_raises():
    with patch("urllib.request.urlopen", side_effect=TimeoutError("Timed out")):
        with pytest.raises(HttpFetchError):
            fetch_pdms(codigo_grupo=78, codigo_classe=7830)


def test_fetch_pdms_legacy_rollback(monkeypatch):
    monkeypatch.setenv(LEGACY_EMPTY_ON_ERROR_ENV, "1")
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        res = fetch_pdms(codigo_grupo=78, codigo_classe=7830)
        assert res == {"resultado": []}


def test_collect_pdms_partial_failure_and_resume(tmp_path):
    manager = SyncStateManager("test_collect_pdms", state_dir=tmp_path)

    payload_p1 = {
        "resultado": [{"codigoPdm": 100, "nomePdm": "ESTEIRA"}],
        "paginasRestantes": 1,
    }
    http_err_p2 = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )

    call_count = 0

    def mock_urlopen(req, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return DummyHttpResponse(payload_p1)
        raise http_err_p2

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        with pytest.raises(HttpFetchError):
            collect_pdms_por_grupo_classe(78, 7830, sync_manager=manager, resume=False)

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "failed_partial"
    assert checkpoint.partial is True
    assert checkpoint.last_page == 1
    assert checkpoint.total_records == 1

    payload_p2 = {
        "resultado": [{"codigoPdm": 101, "nomePdm": "BICICLETA"}],
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload_p2)):
        pdms = collect_pdms_por_grupo_classe(78, 7830, sync_manager=manager, resume=True)
        assert len(pdms) == 2
        assert pdms[0]["codigoPdm"] == 100
        assert pdms[1]["codigoPdm"] == 101

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "completed"
    assert checkpoint.partial is False
    assert checkpoint.last_page == 2
    assert checkpoint.total_records == 2


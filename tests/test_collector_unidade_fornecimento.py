"""Tests for E6: collector_unidade_fornecimento.py."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_unidade_fornecimento import fetch_unidades, collect_unidades_por_grupo_classe
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


def test_fetch_unidades_200_success():
    payload = {
        "resultado": [{"codigoUnidade": 1, "nomeUnidade": "UNIDADE"}],
        "totalRegistros": 1,
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_unidades(codigo_grupo=78, codigo_classe=7830)
        assert len(res["resultado"]) == 1


def test_fetch_unidades_200_empty():
    payload = {"resultado": [], "totalRegistros": 0, "paginasRestantes": 0}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_unidades(codigo_grupo=78, codigo_classe=7830)
        assert res["resultado"] == []


def test_fetch_unidades_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_unidades(codigo_grupo=78, codigo_classe=7830, max_retries=1)
        assert exc_info.value.status_code == 500


def test_fetch_unidades_429_exhausted_raises():
    http_429 = urllib.error.HTTPError(
        url="http://test",
        code=429,
        msg="Too Many Requests",
        hdrs={},
        fp=io.BytesIO(b"rate limited"),
    )
    with patch("urllib.request.urlopen", side_effect=http_429) as mock_urlopen:
        with patch("time.sleep"):
            with pytest.raises(HttpFetchError) as exc_info:
                fetch_unidades(codigo_grupo=78, codigo_classe=7830, max_retries=3)
            assert mock_urlopen.call_count == 3
            assert exc_info.value.status_code == 429


def test_collect_unidades_fails_on_500():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=503,
        msg="Unavailable",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            collect_unidades_por_grupo_classe(78, 7830)


def test_fetch_unidades_legacy_rollback(monkeypatch):
    monkeypatch.setenv(LEGACY_EMPTY_ON_ERROR_ENV, "1")
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        res = fetch_unidades(codigo_grupo=78, codigo_classe=7830, max_retries=1)
        assert res == {"resultado": []}


def test_collect_unidades_partial_failure_and_resume(tmp_path):
    manager = SyncStateManager("test_collect_unidades", state_dir=tmp_path)

    payload_p1 = {
        "resultado": [{"codigoUnidade": 1, "nomeUnidade": "UN 1"}],
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
        with patch("time.sleep"):
            with pytest.raises(HttpFetchError):
                collect_unidades_por_grupo_classe(78, 7830, sync_manager=manager, resume=False)

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "failed_partial"
    assert checkpoint.partial is True
    assert checkpoint.last_page == 1
    assert checkpoint.total_records == 1

    payload_p2 = {
        "resultado": [{"codigoUnidade": 2, "nomeUnidade": "UN 2"}],
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload_p2)):
        with patch("time.sleep"):
            unidades = collect_unidades_por_grupo_classe(78, 7830, sync_manager=manager, resume=True)
            assert len(unidades) == 1
            assert unidades[0]["codigoUnidade"] == 2

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "completed"
    assert checkpoint.partial is False
    assert checkpoint.last_page == 2
    assert checkpoint.total_records == 2


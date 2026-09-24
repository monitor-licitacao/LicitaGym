"""Tests for E5: collector_natureza_despesa.py."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_natureza_despesa import fetch_naturezas, collect_naturezas_por_grupo_classe
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


def test_fetch_naturezas_with_codigo_pdm():
    """Verify that fetch_naturezas correctly accepts and sends codigoPdm in request query."""
    payload = {
        "resultado": [{"codigoNatureza": 339030, "nomeNatureza": "MATERIAL DE CONSUMO"}],
        "totalRegistros": 1,
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)) as mock_urlopen:
        res = fetch_naturezas(codigo_pdm=2640, pagina=1, tamanho_pagina=500)
        assert len(res["resultado"]) == 1
        assert mock_urlopen.called
        req = mock_urlopen.call_args[0][0]
        assert "codigoPdm=2640" in req.full_url


def test_fetch_naturezas_200_success():
    payload = {
        "resultado": [{"codigoNatureza": 339030, "nomeNatureza": "MATERIAL DE CONSUMO"}],
        "totalRegistros": 1,
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_naturezas(codigo_grupo=78, codigo_classe=7830)
        assert len(res["resultado"]) == 1


def test_fetch_naturezas_200_empty():
    payload = {"resultado": [], "totalRegistros": 0, "paginasRestantes": 0}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_naturezas(codigo_grupo=78, codigo_classe=7830)
        assert res["resultado"] == []


def test_fetch_naturezas_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch_naturezas(codigo_grupo=78, codigo_classe=7830)


def test_collect_naturezas_fails_on_500():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=502,
        msg="Bad Gateway",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            collect_naturezas_por_grupo_classe(78, 7830)


def test_fetch_naturezas_legacy_rollback(monkeypatch):
    monkeypatch.setenv(LEGACY_EMPTY_ON_ERROR_ENV, "1")
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        res = fetch_naturezas(codigo_grupo=78, codigo_classe=7830)
        assert res == {"resultado": []}


def test_collect_naturezas_partial_failure_and_resume(tmp_path):
    manager = SyncStateManager("test_collect_naturezas", state_dir=tmp_path)

    payload_p1 = {
        "resultado": [{"codigoNatureza": 339030, "nomeNatureza": "NAT 1"}],
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
            collect_naturezas_por_grupo_classe(78, 7830, sync_manager=manager, resume=False)

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "failed_partial"
    assert checkpoint.partial is True
    assert checkpoint.last_page == 1
    assert checkpoint.total_records == 1

    payload_p2 = {
        "resultado": [{"codigoNatureza": 339031, "nomeNatureza": "NAT 2"}],
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload_p2)):
        naturezas = collect_naturezas_por_grupo_classe(78, 7830, sync_manager=manager, resume=True)
        assert len(naturezas) == 2
        assert naturezas[0]["codigoNatureza"] == 339030
        assert naturezas[1]["codigoNatureza"] == 339031

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "completed"
    assert checkpoint.partial is False
    assert checkpoint.last_page == 2
    assert checkpoint.total_records == 2


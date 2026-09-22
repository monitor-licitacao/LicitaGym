"""Tests for collector_pncp_contratacoes.py."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_pncp_contratacoes import fetch_contratacoes, collect_contratacoes, ITEMS_E4
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


def test_fetch_contratacoes_200_success():
    payload = {
        "data": [{"numero": "123/2026", "modalidade": "Pregão"}],
        "totalRegistros": 1,
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_contratacoes(pagina=1, data_inicial="20260101", data_final="20260301")
        assert len(res["data"]) == 1


def test_fetch_contratacoes_200_empty():
    payload = {"data": [], "totalRegistros": 0, "paginasRestantes": 0}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_contratacoes(pagina=1, data_inicial="20260101", data_final="20260301")
        assert res["data"] == []


def test_fetch_contratacoes_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch_contratacoes(pagina=1, data_inicial="20260101", data_final="20260301")


def test_fetch_contratacoes_timeout_raises():
    with patch("urllib.request.urlopen", side_effect=TimeoutError("Timed out")):
        with pytest.raises(HttpFetchError):
            fetch_contratacoes(pagina=1, data_inicial="20260101", data_final="20260301")


def test_fetch_contratacoes_legacy_rollback(monkeypatch):
    monkeypatch.setenv(LEGACY_EMPTY_ON_ERROR_ENV, "1")
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        res = fetch_contratacoes(pagina=1, data_inicial="20260101", data_final="20260301")
        assert res == {"data": []}


def test_collect_contratacoes_partial_failure_and_resume(tmp_path):
    manager = SyncStateManager("test_collect_pncp", state_dir=tmp_path)

    payload_p1 = {
        "data": [
            {
                "numero": "100/2026",
                "modalidade": "Pregão",
                "dataPublicacao": "2026-01-01",
                "itens": [
                    {
                        "codigoItemCatalogo": 374066,
                        "quantidade": 2,
                        "fornecedores": [
                            {"ni": "12345678000199", "nome": "FITNESS FORNECEDOR", "preco": 1500.0}
                        ]
                    }
                ]
            }
        ],
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

    ITEMS_E4[374066] = "BICICLETA"

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        with pytest.raises(HttpFetchError):
            collect_contratacoes("20260101", "20260301", max_pages=3, sync_manager=manager, resume=False)

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "failed_partial"
    assert checkpoint.partial is True
    assert checkpoint.last_page == 1
    assert checkpoint.total_records == 1

    payload_p2 = {"data": []}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload_p2)):
        precos = collect_contratacoes("20260101", "20260301", max_pages=3, sync_manager=manager, resume=True)
        assert len(precos) == 1
        assert precos[0]["codigo_item_catalogo"] == 374066

    checkpoint = manager.load_checkpoint()
    assert checkpoint is not None
    assert checkpoint.status == "completed"
    assert checkpoint.partial is False
    assert checkpoint.last_page == 1  # Last successful page was 1
    assert checkpoint.total_records == 1


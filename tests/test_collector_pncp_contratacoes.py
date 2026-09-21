"""Tests for collector_pncp_contratacoes.py."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_pncp_contratacoes import fetch_contratacoes
from scripts.lib.http_fetch import HttpFetchError, LEGACY_EMPTY_ON_ERROR_ENV


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

"""Tests for collector_pesquisa_preco.py."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_pesquisa_preco import fetch_material, fetch_detalhe
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


def test_fetch_material_200_success():
    payload = {"resultado": [{"codigoMaterial": 999, "descricao": "ANILHA"}], "totalRegistros": 1}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_material(codigo_item=374066)
        assert len(res["resultado"]) == 1


def test_fetch_material_200_empty():
    payload = {"resultado": [], "totalRegistros": 0}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_material(codigo_item=374066)
        assert res["resultado"] == []


def test_fetch_material_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch_material(codigo_item=374066)


def test_fetch_detalhe_timeout_raises():
    with patch("urllib.request.urlopen", side_effect=TimeoutError("Timed out")):
        with pytest.raises(HttpFetchError):
            fetch_detalhe(codigo_material=999)


def test_fetch_material_legacy_rollback(monkeypatch):
    monkeypatch.setenv(LEGACY_EMPTY_ON_ERROR_ENV, "1")
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        res = fetch_material(codigo_item=374066)
        assert res == {"resultado": []}

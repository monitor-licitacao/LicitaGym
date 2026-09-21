"""Tests for E4: collector_item_material.py."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_item_material import fetch_items, collect_items_por_grupo_classe
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


def test_fetch_items_200_success():
    payload = {
        "resultado": [{"codigoItem": 374066, "descricaoItem": "BICICLETA ERGOMETRICA"}],
        "totalRegistros": 1,
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_items(codigo_grupo=78, codigo_classe=7830)
        assert len(res["resultado"]) == 1
        assert res["resultado"][0]["codigoItem"] == 374066


def test_fetch_items_200_empty():
    payload = {"resultado": [], "totalRegistros": 0, "paginasRestantes": 0}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_items(codigo_grupo=78, codigo_classe=7830)
        assert res["resultado"] == []


def test_fetch_items_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch_items(codigo_grupo=78, codigo_classe=7830)


def test_collect_items_fails_on_timeout():
    with patch("urllib.request.urlopen", side_effect=TimeoutError("Timed out")):
        with pytest.raises(HttpFetchError):
            collect_items_por_grupo_classe(78, 7830)


def test_fetch_items_legacy_rollback(monkeypatch):
    monkeypatch.setenv(LEGACY_EMPTY_ON_ERROR_ENV, "1")
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        res = fetch_items(codigo_grupo=78, codigo_classe=7830)
        assert res == {"resultado": []}

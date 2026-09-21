"""Tests for E1: collector_grupo_material.py."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_grupo_material import fetch_grupos, collect_grupos
from scripts.lib.http_fetch import HttpFetchError


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


def test_fetch_grupos_200_success():
    payload = {
        "resultado": [{"codigoGrupo": 78, "nomeGrupo": "EQUIPAMENTOS FITNESS"}],
        "totalRegistros": 1,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_grupos(pagina=1)
        assert len(res["resultado"]) == 1


def test_fetch_grupos_200_empty():
    payload = {"resultado": []}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_grupos(pagina=1)
        assert res["resultado"] == []


def test_fetch_grupos_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch_grupos(pagina=1, max_retries=1)


def test_collect_grupos_fails_on_500():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            collect_grupos()

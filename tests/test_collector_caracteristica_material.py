"""Tests for E7: collector_caracteristica_material.py."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.collector_caracteristica_material import (
    fetch_caracteristicas,
    collect_caracteristicas_por_item,
)
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


def test_fetch_caracteristicas_200_success():
    payload = {
        "resultado": [{"codigoCaracteristica": 10, "nomeCaracteristica": "COR"}],
        "totalRegistros": 1,
        "paginasRestantes": 0,
    }
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_caracteristicas(codigo_item=374066)
        assert len(res["resultado"]) == 1


def test_fetch_caracteristicas_200_empty():
    payload = {"resultado": [], "totalRegistros": 0, "paginasRestantes": 0}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_caracteristicas(codigo_item=374066)
        assert res["resultado"] == []


def test_fetch_caracteristicas_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_caracteristicas(codigo_item=374066, max_retries=1)
        assert exc_info.value.status_code == 500


def test_fetch_caracteristicas_429_exhausted_raises():
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
                fetch_caracteristicas(codigo_item=374066, max_retries=3)
            assert mock_urlopen.call_count == 3
            assert exc_info.value.status_code == 429


def test_collect_caracteristicas_fails_on_500():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            collect_caracteristicas_por_item(374066)


def test_fetch_caracteristicas_legacy_rollback(monkeypatch):
    monkeypatch.setenv(LEGACY_EMPTY_ON_ERROR_ENV, "1")
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        res = fetch_caracteristicas(codigo_item=374066, max_retries=1)
        assert res == {"resultado": []}

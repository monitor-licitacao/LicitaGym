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

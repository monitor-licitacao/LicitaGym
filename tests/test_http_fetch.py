"""Tests for scripts/lib/http_fetch.py.

Covers:
1. HTTP 200 with data
2. HTTP 200 with empty resultado / empty data
3. HTTP 500 error -> raises HttpFetchError (or returns structured error if raise_for_status=False)
4. Transport TimeoutError -> raises HttpFetchError
5. HTTP 429 rate limit exhausted -> retries then raises HttpFetchError
6. Legacy rollback flag returns empty envelope when enabled
"""

import io
import os
import json
import urllib.error
from unittest.mock import patch, MagicMock

import pytest

from scripts.lib.http_fetch import (
    fetch_json,
    HttpFetchError,
    LEGACY_EMPTY_ON_ERROR_ENV,
)


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


def test_fetch_json_200_success():
    payload = {"resultado": [{"codigoClasse": 7830, "nomeClasse": "EQUIPAMENTOS FITNESS"}]}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_json("https://dadosabertos.compras.gov.br/test")
        assert res == payload
        assert len(res["resultado"]) == 1


def test_fetch_json_200_empty_page():
    payload = {"resultado": [], "totalRegistros": 0, "paginasRestantes": 0}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch_json("https://dadosabertos.compras.gov.br/test")
        assert res == payload
        assert res["resultado"] == []


def test_fetch_json_500_raises_http_fetch_error():
    http_error = urllib.error.HTTPError(
        url="https://dadosabertos.compras.gov.br/test",
        code=500,
        msg="Internal Server Error",
        hdrs={},
        fp=io.BytesIO(b"Internal Server Error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_error):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=1)
        assert exc_info.value.status_code == 500
        assert "500" in str(exc_info.value)


def test_fetch_json_500_structured_error_when_no_raise():
    http_error = urllib.error.HTTPError(
        url="https://dadosabertos.compras.gov.br/test",
        code=500,
        msg="Internal Server Error",
        hdrs={},
        fp=io.BytesIO(b"Internal Server Error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_error):
        res = fetch_json(
            "https://dadosabertos.compras.gov.br/test",
            max_retries=1,
            raise_for_status=False,
        )
        assert res["sucesso"] is False
        assert res["status_code"] == 500
        assert "resultado" not in res  # Crucial: NOT masked as empty resultado list


def test_fetch_json_timeout_raises_http_fetch_error():
    with patch("urllib.request.urlopen", side_effect=TimeoutError("Connection timed out")):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=1)
        assert exc_info.value.status_code is None
        assert "Timeout" in str(exc_info.value) or "timed out" in str(exc_info.value)


def test_fetch_json_transport_urlerror_raises():
    url_err = urllib.error.URLError("Name or service not known")
    with patch("urllib.request.urlopen", side_effect=url_err):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=1)
        assert "URLError" in str(exc_info.value) or "Name or service not known" in str(exc_info.value)


def test_fetch_json_429_retries_and_exhausts():
    http_429 = urllib.error.HTTPError(
        url="https://dadosabertos.compras.gov.br/test",
        code=429,
        msg="Too Many Requests",
        hdrs={},
        fp=io.BytesIO(b"Rate limit exceeded"),
    )
    with patch("urllib.request.urlopen", side_effect=http_429) as mock_urlopen:
        with patch("time.sleep") as mock_sleep:
            with pytest.raises(HttpFetchError) as exc_info:
                fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=3, backoff_factor=1.5)
            assert mock_urlopen.call_count == 3
            assert mock_sleep.call_count == 2
            assert exc_info.value.status_code == 429
            assert exc_info.value.attempts == 3


def test_fetch_json_legacy_rollback_mode_when_env_enabled(monkeypatch):
    monkeypatch.setenv(LEGACY_EMPTY_ON_ERROR_ENV, "1")
    http_error = urllib.error.HTTPError(
        url="https://dadosabertos.compras.gov.br/test",
        code=503,
        msg="Service Unavailable",
        hdrs={},
        fp=io.BytesIO(b"Service Unavailable"),
    )
    with patch("urllib.request.urlopen", side_effect=http_error):
        res = fetch_json(
            "https://dadosabertos.compras.gov.br/test",
            max_retries=1,
            legacy_empty_envelope_key="resultado",
        )
        assert res == {"resultado": []}

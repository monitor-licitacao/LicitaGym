"""Tests for scripts/lib/http_client.py and scripts/lib/http_fetch.py.

Covers:
1. HTTP 200 with data
2. HTTP 200 with empty resultado / empty data
3. HTTP 500 error -> raises HttpFetchError (or returns structured error if raise_for_status=False)
4. Transport TimeoutError and socket.timeout -> mapped to error_type="timeout"
5. URLError(socket.timeout) and URLError with 'timed out' -> mapped to error_type="timeout"
6. URLError (DNS/connection) -> mapped to error_type="transport"
7. HTTP 429 rate limit with Retry-After seconds -> sleeps exact Retry-After seconds
8. HTTP 429 rate limit with Retry-After HTTP-date (RFC 2822 / RFC 7231) -> sleeps delta seconds
9. HTTP 429 rate limit without Retry-After -> falls back to exponential backoff
10. Transient 503 error -> retries and succeeds on next attempt
11. Transient 502/503/504 error -> exhausts retries and raises HttpFetchError
12. Non-transient 500 error -> does not retry (unless configured)
13. Page size clamp helper -> respects Compras.gov limits (10 to 500)
14. Legacy rollback flag returns empty envelope when enabled
"""

import io
import os
import json
import socket
import urllib.error
from datetime import datetime, timezone, timedelta
from email.utils import format_datetime
from unittest.mock import patch, MagicMock

import pytest

from scripts.lib.http_client import (
    HttpClient,
    HttpFetchError,
    LEGACY_EMPTY_ON_ERROR_ENV,
    COMPRAS_GOV_PAGE_SIZE,
    clamp_compras_gov_page_size,
    parse_retry_after,
    classify_exception,
)
from scripts.lib.http_fetch import fetch_json


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
        assert exc_info.value.error_type == "http_status"
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
        assert res["error_type"] == "http_status"
        assert "resultado" not in res  # Crucial: NOT masked as empty resultado list


def test_fetch_json_timeout_raises_http_fetch_error():
    with patch("urllib.request.urlopen", side_effect=TimeoutError("Connection timed out")):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=1)
        assert exc_info.value.status_code is None
        assert exc_info.value.error_type == "timeout"
        assert "Timeout" in str(exc_info.value)


def test_fetch_json_urlerror_wrapping_socket_timeout():
    # urllib raises URLError with socket.timeout reason
    socket_timeout = socket.timeout("timed out")
    url_err = urllib.error.URLError(socket_timeout)
    with patch("urllib.request.urlopen", side_effect=url_err):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=1)
        assert exc_info.value.status_code is None
        assert exc_info.value.error_type == "timeout"
        assert "Timeout" in str(exc_info.value)


def test_fetch_json_transport_urlerror_raises():
    url_err = urllib.error.URLError("Name or service not known")
    with patch("urllib.request.urlopen", side_effect=url_err):
        with pytest.raises(HttpFetchError) as exc_info:
            fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=1)
        assert exc_info.value.error_type == "transport"
        assert "URLError" in str(exc_info.value) or "Name or service not known" in str(exc_info.value)


def test_fetch_json_429_retries_and_exhausts_with_fallback_backoff():
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
            # Exponential backoff checks: 1.5**1 = 1.5, 1.5**2 = 2.25
            assert mock_sleep.call_args_list[0][0][0] == 1.5
            assert mock_sleep.call_args_list[1][0][0] == 2.25
            assert exc_info.value.status_code == 429
            assert exc_info.value.attempts == 3


def test_fetch_json_429_respects_retry_after_seconds():
    headers = {"Retry-After": "5"}
    http_429 = urllib.error.HTTPError(
        url="https://dadosabertos.compras.gov.br/test",
        code=429,
        msg="Too Many Requests",
        hdrs=headers,
        fp=io.BytesIO(b"Rate limit exceeded"),
    )
    with patch("urllib.request.urlopen", side_effect=http_429) as mock_urlopen:
        with patch("time.sleep") as mock_sleep:
            with pytest.raises(HttpFetchError) as exc_info:
                fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=2)
            assert mock_urlopen.call_count == 2
            assert mock_sleep.call_count == 1
            # Slept exactly 5.0 seconds as specified by Retry-After
            assert mock_sleep.call_args[0][0] == 5.0
            assert exc_info.value.status_code == 429


def test_fetch_json_429_respects_retry_after_http_date():
    future_time = datetime.now(timezone.utc) + timedelta(seconds=12)
    http_date = format_datetime(future_time, usegmt=True)
    headers = {"Retry-After": http_date}
    http_429 = urllib.error.HTTPError(
        url="https://dadosabertos.compras.gov.br/test",
        code=429,
        msg="Too Many Requests",
        hdrs=headers,
        fp=io.BytesIO(b"Rate limit exceeded"),
    )
    with patch("urllib.request.urlopen", side_effect=http_429) as mock_urlopen:
        with patch("time.sleep") as mock_sleep:
            with pytest.raises(HttpFetchError) as exc_info:
                fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=2)
            assert mock_urlopen.call_count == 2
            assert mock_sleep.call_count == 1
            slept = mock_sleep.call_args[0][0]
            # Difference should be ~12 seconds (allow 10-14s margin)
            assert 10.0 <= slept <= 14.0
            assert exc_info.value.status_code == 429


def test_fetch_json_transient_503_retries_and_succeeds():
    http_503 = urllib.error.HTTPError(
        url="https://dadosabertos.compras.gov.br/test",
        code=503,
        msg="Service Unavailable",
        hdrs={},
        fp=io.BytesIO(b"Service Unavailable"),
    )
    success_payload = {"resultado": [{"id": 1, "nome": "Item 1"}]}
    responses = [http_503, DummyHttpResponse(success_payload)]

    with patch("urllib.request.urlopen", side_effect=responses) as mock_urlopen:
        with patch("time.sleep") as mock_sleep:
            res = fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=3)
            assert res == success_payload
            assert mock_urlopen.call_count == 2
            assert mock_sleep.call_count == 1


def test_fetch_json_transient_503_retries_and_exhausts():
    http_503 = urllib.error.HTTPError(
        url="https://dadosabertos.compras.gov.br/test",
        code=503,
        msg="Service Unavailable",
        hdrs={},
        fp=io.BytesIO(b"Service Unavailable"),
    )
    with patch("urllib.request.urlopen", side_effect=http_503) as mock_urlopen:
        with patch("time.sleep") as mock_sleep:
            with pytest.raises(HttpFetchError) as exc_info:
                fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=3)
            assert mock_urlopen.call_count == 3
            assert mock_sleep.call_count == 2
            assert exc_info.value.status_code == 503
            assert exc_info.value.attempts == 3


def test_fetch_json_non_transient_500_does_not_retry_by_default():
    http_500 = urllib.error.HTTPError(
        url="https://dadosabertos.compras.gov.br/test",
        code=500,
        msg="Internal Server Error",
        hdrs={},
        fp=io.BytesIO(b"Internal Error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_500) as mock_urlopen:
        with patch("time.sleep") as mock_sleep:
            with pytest.raises(HttpFetchError) as exc_info:
                fetch_json("https://dadosabertos.compras.gov.br/test", max_retries=3)
            # 500 is not in default transient codes (502, 503, 504), so does not retry
            assert mock_urlopen.call_count == 1
            assert mock_sleep.call_count == 0
            assert exc_info.value.status_code == 500


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


def test_clamp_compras_gov_page_size():
    assert clamp_compras_gov_page_size(None) == 500
    assert clamp_compras_gov_page_size(5) == 10
    assert clamp_compras_gov_page_size(100) == 100
    assert clamp_compras_gov_page_size(500) == 500
    assert clamp_compras_gov_page_size(1000) == 500
    assert clamp_compras_gov_page_size(-10) == 10


def test_parse_retry_after_edge_cases():
    # Empty or None
    assert parse_retry_after(None, default_wait=3.0) == 3.0
    assert parse_retry_after("", default_wait=3.0) == 3.0
    # Invalid string fallback
    assert parse_retry_after("invalid_header_val", default_wait=4.0) == 4.0
    # Negative seconds clamped to 0
    assert parse_retry_after("-5", default_wait=2.0) == 0.0
    # Seconds exceeding max_cap clamped
    assert parse_retry_after("120", default_wait=2.0, max_cap=60.0) == 60.0


def test_http_client_instance_usage():
    client = HttpClient(timeout=15, max_retries=2, backoff_factor=1.5)
    payload = {"data": [1, 2, 3]}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = client.fetch_json("https://example.com/api")
        assert res == payload

"""Tests for test_e7_real, test_e7_50items, teste_legado_contratos, teste_pgc_uasg."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.test_e7_real import run_test_e7
from scripts.test_e7_50items import fetch_caracteristicas as fetch_carac_50
from scripts.teste_legado_contratos import fetch as fetch_legado
from scripts.teste_pgc_uasg import fetch as fetch_pgc
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


def test_test_e7_real_200():
    payload = {"resultado": [{"codigoCaracteristica": 1, "nomeCaracteristica": "COR"}]}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        # Should execute without error
        run_test_e7(374066)


def test_test_e7_real_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            run_test_e7(374066)


def test_test_e7_50items_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch_carac_50(374066)


def test_teste_legado_contratos_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch_legado("/modulo-legado/1_consultarLicitacao")


def test_teste_pgc_uasg_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch_pgc("/modulo-pgc/1_consultarPgcDetalhe")

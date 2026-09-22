"""Tests for scripts/teste_catmat_grupos_72_78.py."""

import io
import json
import urllib.error
from unittest.mock import patch
import pytest

from scripts.teste_catmat_grupos_72_78 import fetch
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


def test_fetch_catmat_200_success():
    payload = {"resultado": [{"codigoGrupo": 78, "nomeGrupo": "EQUIPAMENTOS FITNESS"}]}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch("/modulo-material/1_consultarGrupoMaterial", {"pagina": 1, "tamanhoPagina": 500})
        assert len(res) == 1
        assert res[0]["codigoGrupo"] == 78


def test_fetch_catmat_200_empty():
    payload = {"resultado": []}
    with patch("urllib.request.urlopen", return_value=DummyHttpResponse(payload)):
        res = fetch("/modulo-material/1_consultarGrupoMaterial", {"pagina": 1, "tamanhoPagina": 500})
        assert res == []


def test_fetch_catmat_500_raises():
    http_err = urllib.error.HTTPError(
        url="http://test",
        code=500,
        msg="Internal Error",
        hdrs={},
        fp=io.BytesIO(b"error"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        with pytest.raises(HttpFetchError):
            fetch("/modulo-material/1_consultarGrupoMaterial", {"pagina": 1, "tamanhoPagina": 500})


def test_fetch_catmat_disallowed_path_raises_value_error():
    with pytest.raises(ValueError, match="Path não permitido"):
        fetch("/modulo-desconhecido/endpoint")


def test_teste_catmat_hash_helper():
    from scripts.lib.payload_hash import compute_payload_hash
    sample = {"codigo_grupo": 78, "codigo_item": 12345, "descricao_item": "Halter"}
    h = compute_payload_hash(sample)
    assert len(h) == 64


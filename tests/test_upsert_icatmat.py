"""Tests for upsert_icatmat_consolidado.py and upsert_icatmat_remoto.py.

Verifies:
- SEC-P1-01: refuse to run without SUPABASE_URL / key in environment.
- On_conflict: ensures explicit on_conflict is provided for each table.
- Enrich functions compute 64-character SHA-256 hashes.
"""

import os
import sys
import json
import pytest
from unittest.mock import patch, MagicMock

import scripts.upsert_icatmat_consolidado as consolidado
from scripts.upsert_icatmat_consolidado import (
    TABLE_ON_CONFLICT,
    upsert_table,
    enrich_e1,
    enrich_e2,
    enrich_e3,
    enrich_e4,
    enrich_e5,
    enrich_e6,
    enrich_e7,
)


def test_sec_p1_01_no_hardcoded_jwt_in_source():
    """Verify that no literal JWT string exists in upsert_icatmat_consolidado.py."""
    with open("scripts/upsert_icatmat_consolidado.py", "r", encoding="utf-8") as f:
        content = f.read()
    assert "eyJhbGciOi" not in content
    assert "dummy" not in content


def test_consolidado_refuses_to_run_without_supabase_client(monkeypatch):
    """When supabase client is None (missing env vars or library), main() returns 1."""
    monkeypatch.setattr(consolidado, "supabase", None)
    exit_code = consolidado.main()
    assert exit_code == 1


def test_table_on_conflict_mapping_completeness():
    """Verify on_conflict definitions match table unique constraints E1-E7."""
    expected = {
        "icatmat_grupo_material": "codigo_grupo",
        "icatmat_classe_material": "codigo_grupo,codigo_classe",
        "icatmat_pdm_material": "codigo_grupo,codigo_classe,codigo_pdm",
        "icatmat_item_material": "codigo_grupo,codigo_classe,codigo_pdm,codigo_item",
        "icatmat_natureza_despesa": "codigo_grupo,codigo_classe,codigo_item,codigo_natureza",
        "icatmat_unidade_fornecimento": "codigo_grupo,codigo_classe,codigo_item,codigo_unidade",
        "icatmat_caracteristica_material": "codigo_grupo,codigo_classe,codigo_item,codigo_caracteristica",
    }
    for table, conflict_cols in expected.items():
        assert TABLE_ON_CONFLICT.get(table) == conflict_cols


def test_upsert_table_passes_on_conflict_to_supabase(monkeypatch):
    """Mock Supabase client and check on_conflict keyword argument."""
    mock_supabase = MagicMock()
    mock_table_query = MagicMock()
    mock_upsert_query = MagicMock()

    mock_supabase.table.return_value = mock_table_query
    mock_table_query.upsert.return_value = mock_upsert_query
    mock_upsert_query.execute.return_value = MagicMock(data=[{"id": 1}])

    monkeypatch.setattr(consolidado, "supabase", mock_supabase)

    records = [{"codigo_grupo": 78, "nome_grupo": "FITNESS", "payload_hash": "abc"}]
    count = upsert_table("icatmat_grupo_material", records)

    assert count == 1
    mock_supabase.table.assert_called_with("icatmat_grupo_material")
    mock_table_query.upsert.assert_called_once_with(records, on_conflict="codigo_grupo")


def test_upsert_table_custom_on_conflict(monkeypatch):
    """Allow overriding on_conflict parameter."""
    mock_supabase = MagicMock()
    mock_table_query = MagicMock()
    mock_upsert_query = MagicMock()

    mock_supabase.table.return_value = mock_table_query
    mock_table_query.upsert.return_value = mock_upsert_query
    mock_upsert_query.execute.return_value = MagicMock(data=[{"id": 1}])

    monkeypatch.setattr(consolidado, "supabase", mock_supabase)

    records = [{"codigo_grupo": 78, "payload_hash": "abc"}]
    count = upsert_table("icatmat_grupo_material", records, on_conflict="payload_hash")

    assert count == 1
    mock_table_query.upsert.assert_called_once_with(records, on_conflict="payload_hash")


def test_enrich_functions_produce_sha256_hash():
    """Verify that enrich functions output 64-char hex SHA-256 hashes."""
    e1_records = [{"codigoGrupo": 78, "nomeGrupo": "Desportos", "dataHoraAtualizacao": "2026-09-20"}]
    res_e1 = enrich_e1(e1_records)
    assert len(res_e1) == 1
    assert len(res_e1[0]["payload_hash"]) == 64
    assert res_e1[0]["codigo_grupo"] == 78

    e4_records = [{
        "codigoGrupo": 78,
        "codigoClasse": 7830,
        "codigoPdm": 123,
        "codigoItem": 456,
        "descricaoItem": "Halter 10kg",
        "dataHoraAtualizacao": "2026-09-20",
    }]
    res_e4 = enrich_e4(e4_records)
    assert len(res_e4) == 1
    assert len(res_e4[0]["payload_hash"]) == 64
    assert res_e4[0]["codigo_item"] == 456


def test_upsert_remoto_includes_on_conflict_query_param():
    """Test upsert_icatmat_remoto.upsert_batch sends on_conflict in URL query."""
    import scripts.upsert_icatmat_remoto as remoto

    mock_records = [{"codigo_grupo": 78, "codigo_item": 1234}]

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.status = 201
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        count = remoto.upsert_batch(
            mock_records,
            batch_size=1,
            supabase_url="https://test.supabase.co",
            service_role_key="test-service-key",
        )

        assert count == 1
        assert mock_urlopen.called
        req = mock_urlopen.call_args[0][0]
        assert "on_conflict=codigo_item,codigo_grupo" in req.full_url or "on_conflict=codigo_item%2Ccodigo_grupo" in req.full_url
        assert req.headers.get("Prefer") == "resolution=merge-duplicates"
        assert req.headers.get("Authorization") == "Bearer test-service-key"
        assert req.headers.get("Apikey") == "test-service-key"


def test_upsert_remoto_refuses_without_credentials():
    """upsert_batch returns 0 if no credentials provided or in env."""
    import scripts.upsert_icatmat_remoto as remoto
    count = remoto.upsert_batch(
        [{"codigo_item": 123}],
        supabase_url="",
        service_role_key="",
    )
    assert count == 0


def test_upsert_remoto_main_returns_1_without_env(monkeypatch):
    """remoto.main() returns 1 if SUPABASE_URL / key are missing."""
    import scripts.upsert_icatmat_remoto as remoto
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)
    monkeypatch.setattr(remoto, "SUPABASE_URL", None)
    monkeypatch.setattr(remoto, "SERVICE_ROLE_KEY", None)

    code = remoto.main()
    assert code == 1


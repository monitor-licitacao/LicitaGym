"""Testes offline da extração do processo administrativo a partir do edital."""
import io
import zipfile
from collections import Counter
from unittest.mock import MagicMock

from coletor import processo_edital as P


def test_fraco():
    assert P.fraco(None) and P.fraco("") and P.fraco("4") and P.fraco("0080")
    assert not P.fraco("74/2026")
    assert not P.fraco("04035-00002433/2025-00")
    assert not P.fraco("14702")


def test_candidatos_variacoes():
    t = """PREFEITURA MUNICIPAL
    PROCESSO ADMINISTRATIVO Nº 137/2026
    PREGÃO ELETRÔNICO Nº 65/2026
    Processo Licitatório n.º 0204000080/2025
    PROCESSO SEI: 23456.000123/2026-11
    Processo nº 12/2026"""
    c = dict(P.candidatos(t))
    assert c["137/2026"] == 5
    assert c["0204000080/2025"] == 4
    assert c["23456.000123/2026-11"] == 5
    assert c["12/2026"] == 1


def test_escolher_prefere_administrativo_e_ignora_fracos():
    cands = [("12/2026", 1), ("137/2026", 5), ("4", 5)]
    assert P.escolher(cands, "4") == "137/2026"
    assert P.escolher([("38", 5)], "38") is None


def test_escolher_compatibilidade_com_pncp():
    assert P.escolher([("005/2026", 1), ("004/2026", 1)], "4") == "004/2026"


def _pdf_com_texto(texto: str) -> bytes:
    # PDF mínimo com camada de texto (1 página)
    stream = f"BT /F1 12 Tf 50 750 Td ({texto}) Tj ET".encode("latin-1")
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offs = io.BytesIO(), []
    out.write(b"%PDF-1.4\n")
    for i, o in enumerate(objs, 1):
        offs.append(out.tell())
        out.write(b"%d 0 obj\n" % i + o + b"\nendobj\n")
    xref = out.tell()
    out.write(b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1))
    for o in offs:
        out.write(b"%010d 00000 n \n" % o)
    out.write(b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF" % (len(objs) + 1, xref))
    return out.getvalue()


def test_processo_do_edital_zip():
    texto = "EDITAL DE PREGAO ELETRONICO No 4/2026 - PROCESSO ADMINISTRATIVO No 0137/2026 - " + "x" * 120
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("edital.pdf", _pdf_com_texto(texto))
    pncp = MagicMock()
    pncp.compra.return_value = {"objetoCompra": "material de expediente", "processo": "4"}
    pncp.arquivos.return_value = [
        {"titulo": "anexo.pdf", "tipoDocumentoNome": "Outros", "url": "u2"},
        {"titulo": "185062_editais.zip", "tipoDocumentoNome": "Edital", "url": "u1"},
    ]
    pncp.baixar.return_value = (buf.getvalue(), "application/zip")
    ach = P.processo_do_edital(pncp, {"title": "Edital nº 4/2026"}, "4", Counter(), edital="Edital nº 4/2026")
    assert ach.status == "encontrado"
    assert (ach.processo, ach.fonte, ach.arquivo, ach.peso) == ("0137/2026", "edital", "185062_editais.zip", 5)
    assert "PROCESSO ADMINISTRATIVO" in ach.trecho
    pncp.baixar.assert_called_once_with("u1", P.MAX_BYTES)   # Edital primeiro


def test_processo_nos_metadados_nao_baixa():
    pncp = MagicMock()
    pncp.compra.return_value = {"objetoCompra": "Aquisição de grama sintética"}
    ach = P.processo_do_edital(pncp, {"title": "Pregão - Eletrônico nº 65 | Processo 137/2026"}, "65", Counter())
    assert (ach.status, ach.processo, ach.fonte) == ("encontrado", "137/2026", "metadados")
    pncp.arquivos.assert_not_called()

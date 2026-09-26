"""Completa o PROCESSO ADMINISTRATIVO a partir do texto do edital (PNCP).

Muitos municípios informam ao PNCP só um número curto no campo 'processo' ("4", "38"),
sem ano, o que não identifica o certame. O número completo costuma estar na capa/preâmbulo
do edital ("PROCESSO ADMINISTRATIVO Nº 137/2026"). Este módulo:
  1. seleciona as compras PNCP com processo fraco (vazio, ou sem ano e com menos de 5 dígitos);
  2. procura primeiro no título/objeto/informação complementar (grátis);
  3. depois baixa os arquivos da compra (Edital primeiro; ZIPs são abertos) e lê as primeiras páginas;
  4. grava o melhor candidato em numero_processo e guarda o valor original do PNCP em
     raw.processo_pncp (+ raw.processo_fonte, raw.processo_arquivo).

  python3 -m coletor.processo_edital --dry-run        # só mostra o que acharia
  python3 -m coletor.processo_edital                  # grava
  python3 -m coletor.processo_edital --todos          # reavalia também os que já parecem bons
PDF escaneado (sem texto) é ignorado e contado em 'escaneados'.
"""
from __future__ import annotations

import argparse
import logging
import re
import threading
import time
import unicodedata
from collections import Counter

from .destino import Supabase, env
from .pncp import PNCP
from .textos import extrair

log = logging.getLogger("processo_edital")

# Sinal de vida: a cada 20 s loga o que está fazendo (para saber se travou ou só está lento)
_estado = {"etapa": "iniciando", "desde": time.time()}


def _etapa(texto: str) -> None:
    _estado.update(etapa=texto, desde=time.time())
    log.info("    %s", texto)


def _batimento(parar: threading.Event, intervalo: int = 20) -> None:
    while not parar.wait(intervalo):
        log.info("    ... ainda em: %s (%ds)", _estado["etapa"], int(time.time() - _estado["desde"]))

PAGINAS_POR_ARQUIVO = 6          # capa + preâmbulo bastam
MAX_BYTES = 40 * 1024 * 1024
MAX_ARQUIVOS = 4

# Qualificador -> peso (maior = mais confiável como processo administrativo)
_QUALIF = [
    (r"ADMINISTRATIVO", 5),
    (r"SEI", 5),
    (r"LICITATORIO", 4),
    (r"DE\s+COMPRAS?", 3),
    (r"INTERNO", 3),
    (r"DE\s+CONTRATACAO", 3),
    (r"", 1),                     # "Processo nº 137/2026" puro
]
_NUM = r"(\d[\d.\-/]{0,40}\d|\d)"
_NO = r"(?:N\s*[ºO°\.]*\s*|NUMERO\s*|NRO\.?\s*)?"
_PADROES = [
    (re.compile(rf"\bPROCESSO\s+{q}\s*{_NO}[:\-–]?\s*{_NUM}" if q else rf"\bPROCESSO\s*{_NO}[:\-–]?\s*{_NUM}"), peso)
    for q, peso in _QUALIF
]
_ANO = re.compile(r"(?<!\d)(19|20)\d{2}(?!\d)")


def _normalizar(t: str) -> str:
    t = unicodedata.normalize("NFKD", t or "")
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    return re.sub(r"[ \t ]+", " ", t.upper())


def digitos(v: str | None) -> str:
    return re.sub(r"\D", "", v or "")


def tem_ano(v: str | None) -> bool:
    return bool(_ANO.search(v or ""))


def fraco(v: str | None) -> bool:
    """Processo que não identifica o certame: vazio, ou sem ano e com menos de 5 dígitos."""
    d = digitos(v)
    return not d or (not tem_ano(v) and len(d) < 5)


def candidatos(texto: str) -> list[tuple[str, int]]:
    """Lista (numero, peso) encontrados no texto, na ordem de aparição."""
    t = _normalizar(texto)
    achados: list[tuple[int, str, int]] = []
    for rx, peso in _PADROES:
        for m in rx.finditer(t):
            num = m.group(1).strip(".-/")
            if num:
                achados.append((m.start(), num, peso))
    # um mesmo trecho casa com o padrão específico e com o genérico: fica o de maior peso
    por_pos: dict[int, tuple[str, int]] = {}
    for pos, num, peso in achados:
        if pos not in por_pos or peso > por_pos[pos][1]:
            por_pos[pos] = (num, peso)
    return [por_pos[p] for p in sorted(por_pos)]


def escolher(cands: list[tuple[str, int]], atual: str | None) -> str | None:
    """Melhor candidato forte (com ano ou >= 5 dígitos). Prioriza peso, depois frequência,
    depois compatibilidade com o número curto do PNCP (ex.: '4' combina com '004/2026')."""
    fortes = [(n, p) for n, p in cands if not fraco(n)]
    if not fortes:
        return None
    freq = Counter(digitos(n) for n, _ in fortes)
    d_atual = digitos(atual).lstrip("0")

    def nota(item):
        n, p = item
        d = digitos(n)
        compat = 1 if d_atual and d.lstrip("0").startswith(d_atual) else 0
        return (p, compat, freq[d], tem_ano(n))

    return max(fortes, key=nota)[0]


def _ordem_arquivos(arqs: list[dict]) -> list[dict]:
    def prio(a):
        tipo = _normalizar(a.get("tipoDocumentoNome") or "")
        nome = _normalizar(a.get("titulo") or "")
        if "EDITAL" in tipo or "EDITAL" in nome:
            return 0
        if "AVISO" in tipo or "AVISO" in nome or "CAPA" in nome:
            return 1
        if "TERMO DE REFERENCIA" in tipo or "TERMO" in nome:
            return 2
        return 3
    return sorted([a for a in arqs if a.get("statusAtivo", True)], key=prio)


def processo_do_edital(pncp: PNCP, c: dict, atual: str | None, resumo: Counter) -> tuple[str | None, str, str | None]:
    """Retorna (processo, fonte, arquivo). fonte: 'metadados' | 'edital' | '' | 'falha'.

    'falha': nada encontrado e alguma consulta (detalhe, lista de arquivos ou download) falhou,
    então "não achou" não é conclusivo. '' = consultas ok e nenhum processo nos documentos."""
    falhou = False
    _etapa("consultando detalhe da compra no PNCP")
    try:
        det = pncp.compra(c)
    except Exception as e:
        log.warning("    detalhe indisponível: %s", e)
        falhou = True
        det = None
    meta = " \n".join(filter(None, [
        " \n".join(str(det.get(k) or "") for k in ("objetoCompra", "informacaoComplementar")) if isinstance(det, dict) else "",
        c.get("title") or "",
    ]))
    p = escolher(candidatos(meta), atual)
    if p:
        return p, "metadados", None

    _etapa("listando arquivos da compra")
    try:
        arqs = _ordem_arquivos(pncp.arquivos(c))
    except Exception as e:
        log.warning("    arquivos indisponíveis: %s", e)
        return None, "falha", None
    for a in arqs[:MAX_ARQUIVOS]:
        url, nome = a.get("url") or a.get("uri"), a.get("titulo") or "arquivo"
        _etapa(f"baixando {nome[:60]}")
        try:
            conteudo, _ = pncp.baixar(url, MAX_BYTES)
        except Exception as e:
            log.warning("    falha ao baixar %s: %s", nome[:60], e)
            resumo["falha_download"] += 1
            falhou = True
            continue
        _etapa(f"lendo {nome[:50]} ({len(conteudo) / 1048576:.1f} MB)")
        res = extrair(conteudo, nome)
        resumo["escaneados"] += len(res.pdfs_escaneados)
        # primeiras páginas de cada arquivo (em ZIP, cada PDF interno conta separado)
        vistos: Counter = Counter()
        texto = []
        for pg in res.paginas:
            if vistos[pg.origem] < PAGINAS_POR_ARQUIVO:
                texto.append(pg.texto)
                vistos[pg.origem] += 1
        p = escolher(candidatos("\n".join(texto)), atual)
        if p:
            return p, "edital", nome
    return None, ("falha" if falhou else ""), None


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="não grava; só mostra")
    ap.add_argument("--todos", action="store_true", help="avalia também compras com processo que já parece completo")
    ap.add_argument("--limite", type=int, help="máximo de compras a processar")
    a = ap.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    sb = Supabase(env("SUPABASE_URL", obrigatorio=True), env("SUPABASE_SERVICE_ROLE_KEY", obrigatorio=True))
    pncp = PNCP(delay=float(env("DELAY_SEGUNDOS", "0.5")))
    linhas = sb.selecionar("licitacoes_externas", fonte="eq.pncp", select="id,codigo_externo,numero_processo,numero_edital,raw")
    alvo = [ln for ln in linhas if a.todos or fraco(ln.get("numero_processo"))]
    if a.limite:
        alvo = alvo[: a.limite]
    log.info("%d compras PNCP, %d com processo fraco a verificar", len(linhas), len(alvo))

    resumo: Counter = Counter(lidas=0, atualizadas=0, nao_encontrado=0, falha_consulta=0)
    parar = threading.Event()
    threading.Thread(target=_batimento, args=(parar,), daemon=True).start()
    for i, ln in enumerate(alvo, 1):
        resumo["lidas"] += 1
        log.info("[%d/%d] %s (processo PNCP: %s)", i, len(alvo), ln.get("codigo_externo"), ln.get("numero_processo"))
        m = re.match(r"(\d{14})-\d-(\d+)/(\d{4})$", ln.get("codigo_externo") or "")
        if not m:
            continue
        c = {"orgao_cnpj": m.group(1), "numero_sequencial": int(m.group(2)), "ano": int(m.group(3)),
             "numero_controle_pncp": ln["codigo_externo"], "title": ln.get("numero_edital")}
        atual = ln.get("numero_processo")
        novo, fonte, arquivo = processo_do_edital(pncp, c, atual, resumo)
        if not novo and fonte == "falha":
            resumo["falha_consulta"] += 1
            log.info("  %s: consulta falhou, nada gravado (PNCP=%s)", ln["codigo_externo"], atual)
            continue
        if not novo or digitos(novo) == digitos(atual):
            resumo["nao_encontrado"] += 1
            log.info("  %s: PNCP=%s -> nada melhor no edital", ln["codigo_externo"], atual)
            continue
        log.info("  %s: PNCP=%s -> %s (%s%s)", ln["codigo_externo"], atual, novo, fonte,
                 f": {arquivo[:60]}" if arquivo else "")
        if not a.dry_run:
            raw = dict(ln.get("raw") or {})
            raw.setdefault("processo_pncp", atual)
            raw.update({"processo_fonte": fonte, "processo_arquivo": arquivo})
            sb.atualizar("licitacoes_externas", ln["id"], {"numero_processo": novo, "raw": raw})
        resumo["atualizadas"] += 1
    parar.set()
    log.info("RESUMO%s: %s", " (dry-run)" if a.dry_run else "", dict(resumo))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

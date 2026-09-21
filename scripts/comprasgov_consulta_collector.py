#!/usr/bin/env python3
"""
Compras.gov.br Consulta Collector
Extrai dados via 77 endpoints com segurança, rastreabilidade e retry.

Padrão:
- Máx 3 requisições paralelas
- 500ms delay entre lotes
- Retry exponencial (3x) com backoff
- Timeout 30s por requisição
- Logging detalhado

Uso:
    python3 scripts/comprasgov_consulta_collector.py --modulo 01-PCA
    python3 scripts/comprasgov_consulta_collector.py --data-inicio 2026-09-01 --data-fim 2026-09-30
"""

import json
import sys
import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
from urllib.parse import urlencode
from dataclasses import dataclass, asdict

from scripts.lib.http_client import (
    HttpClient,
    HttpFetchError,
    clamp_compras_gov_page_size,
    is_legacy_empty_on_error_enabled,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
MAX_PARALELO = 3
DELAY_ENTRE_LOTES_MS = 500
TIMEOUT_REQUISICAO = 30
MAX_RETRIES = 3

@dataclass
class EndpointConsulta:
    """Definição de um endpoint de consulta"""
    modulo: str
    nome: str
    metodo: str
    path: str
    parametros: Dict[str, Dict[str, Any]]
    temPaginacao: bool
    temVarianteCsv: bool
    descricao: Optional[str] = None

@dataclass
class ConsultaResultado:
    """Resultado de uma consulta"""
    endpoint: str
    modulo: str
    sucesso: bool
    registrosTotais: int
    registrosProcessados: int
    erros: List[str]
    tempoMs: int
    dataExecucao: str
    tentativas: int

class ConsultaComprasGovCollector:
    """Collector seguro para 77 endpoints do Compras.gov.br"""

    def __init__(self, schema_path: Optional[str] = None):
        self.catalogo: Dict[str, EndpointConsulta] = {}
        self.resultados: List[ConsultaResultado] = []
        self.session: Optional[Any] = None
        self.client = HttpClient(
            timeout=TIMEOUT_REQUISICAO,
            max_retries=MAX_RETRIES,
            user_agent="LicitaGym/1.0 (+https://licitagym.com)",
        )

        if schema_path:
            self.carrega_schema(schema_path)
        else:
            self.inicializa_catlogo_placeholder()

    def inicializa_catlogo_placeholder(self):
        """Placeholder enquanto schema JSON não chegar"""
        logger.warning("Schema JSON não fornecido. Usando placeholder vazio.")

    def carrega_schema(self, caminho: str):
        """Carrega endpoints do schema JSON (suporta formato 'endpoints' e formato 'modulos')"""
        try:
            with open(caminho, 'r', encoding='utf-8') as f:
                schema = json.load(f)

            if 'endpoints' in schema:
                for ep_dict in schema['endpoints']:
                    ep = EndpointConsulta(**ep_dict)
                    self.catalogo[ep.nome] = ep
            elif 'modulos' in schema:
                for mod in schema['modulos']:
                    mod_nome = mod.get('modulo', 'desconhecido')
                    for ep_dict in mod.get('endpoints', []):
                        nome = ep_dict.get('operationId') or ep_dict.get('nome') or ep_dict.get('path')
                        ep = EndpointConsulta(
                            modulo=mod_nome,
                            nome=nome,
                            metodo=ep_dict.get('metodo', 'GET'),
                            path=ep_dict.get('path', ''),
                            parametros=ep_dict.get('parametros', {}),
                            temPaginacao=ep_dict.get('temPaginacao', True),
                            temVarianteCsv=ep_dict.get('variante_csv', False),
                            descricao=ep_dict.get('summary') or ep_dict.get('descricao'),
                        )
                        self.catalogo[ep.nome] = ep
            else:
                logger.error("Schema JSON inválido: falta 'endpoints' ou 'modulos'")
                return

            logger.info(f"Schema carregado: {len(self.catalogo)} endpoints")
        except Exception as e:
            logger.error(f"Erro ao carregar schema: {e}")

    async def consultar_endpoint(
        self,
        nome_endpoint: str,
        opcoes: Optional[Dict[str, Any]] = None,
    ) -> ConsultaResultado:
        """Consulta um endpoint com retry automático via HttpClient"""

        inicio = time.time()

        endpoint = self.catalogo.get(nome_endpoint)
        if not endpoint:
            return ConsultaResultado(
                endpoint=nome_endpoint,
                modulo="desconhecido",
                sucesso=False,
                registrosTotais=0,
                registrosProcessados=0,
                erros=[f"Endpoint não encontrado: {nome_endpoint}"],
                tempoMs=int((time.time() - inicio) * 1000),
                dataExecucao=datetime.now().isoformat(),
                tentativas=0,
            )

        try:
            resultado = await self._faz_requisicao(endpoint, opcoes or {})
            resultado.tempoMs = int((time.time() - inicio) * 1000)
            resultado.dataExecucao = datetime.now().isoformat()
            return resultado
        except HttpFetchError as e:
            logger.warning(f"Falha na consulta {nome_endpoint}: {e}")
            return ConsultaResultado(
                endpoint=nome_endpoint,
                modulo=endpoint.modulo,
                sucesso=False,
                registrosTotais=0,
                registrosProcessados=0,
                erros=[f"Falha após {e.attempts} tentativa(s): {e}"],
                tempoMs=int((time.time() - inicio) * 1000),
                dataExecucao=datetime.now().isoformat(),
                tentativas=e.attempts,
            )
        except Exception as e:
            logger.error(f"Erro inesperado na consulta {nome_endpoint}: {e}")
            return ConsultaResultado(
                endpoint=nome_endpoint,
                modulo=endpoint.modulo,
                sucesso=False,
                registrosTotais=0,
                registrosProcessados=0,
                erros=[f"Erro inesperado: {e}"],
                tempoMs=int((time.time() - inicio) * 1000),
                dataExecucao=datetime.now().isoformat(),
                tentativas=1,
            )

    async def _faz_requisicao(
        self,
        endpoint: EndpointConsulta,
        opcoes: Dict[str, Any],
    ) -> ConsultaResultado:
        """Faz requisição HTTP para um endpoint usando o HttpClient compartilhado"""

        url = self._monta_url(endpoint, opcoes)

        loop = asyncio.get_running_loop()
        dados = await loop.run_in_executor(
            None,
            lambda: self.client.fetch_json(
                url=url,
                timeout=TIMEOUT_REQUISICAO,
                max_retries=MAX_RETRIES,
                raise_for_status=True,
                legacy_empty_envelope_key="resultado",
            ),
        )

        registros = self._extrai_registros(dados)

        return ConsultaResultado(
            endpoint=endpoint.nome,
            modulo=endpoint.modulo,
            sucesso=True,
            registrosTotais=len(registros),
            registrosProcessados=len(registros),
            erros=[],
            tempoMs=0,
            dataExecucao=datetime.now().isoformat(),
            tentativas=1,
        )

    def _monta_url(self, endpoint: EndpointConsulta, opcoes: Dict[str, Any]) -> str:
        """Monta URL com parâmetros e clamp de page-size"""
        base = BASE_URL.rstrip('/')
        path = endpoint.path if endpoint.path.startswith('/') else f"/{endpoint.path}"
        url = f"{base}{path}"

        params = {}
        if 'data_inicio' in opcoes:
            params['dataInicio'] = opcoes['data_inicio']
        if 'data_fim' in opcoes:
            params['dataFim'] = opcoes['data_fim']
        if 'pagina' in opcoes:
            params['pagina'] = opcoes['pagina']
        if 'pageSize' in opcoes:
            params['pageSize'] = clamp_compras_gov_page_size(opcoes['pageSize'])
        elif 'tamanhoPagina' in opcoes:
            params['tamanhoPagina'] = clamp_compras_gov_page_size(opcoes['tamanhoPagina'])

        if opcoes.get('filtros'):
            params.update(opcoes['filtros'])

        if params:
            url += f"?{urlencode(params)}"

        return url

    def _extrai_registros(self, dados: Any) -> List[Any]:
        """Extrai registros do response (com ou sem paginação)"""
        if isinstance(dados, list):
            return dados
        if isinstance(dados, dict):
            if 'resultado' in dados and isinstance(dados['resultado'], list):
                return dados['resultado']
            if 'data' in dados and isinstance(dados['data'], list):
                return dados['data']
        return []

    async def consultar_multiplos(
        self,
        nomes_endpoints: List[str],
        opcoes: Optional[Dict[str, Any]] = None,
    ) -> List[ConsultaResultado]:
        """Consulta múltiplos endpoints com paralelismo limitado"""

        resultados = []

        for i in range(0, len(nomes_endpoints), MAX_PARALELO):
            lote = nomes_endpoints[i:i + MAX_PARALELO]
            logger.info(f"Processando lote {i//MAX_PARALELO + 1}: {len(lote)} endpoints")

            tarefas = [
                self.consultar_endpoint(nome, opcoes)
                for nome in lote
            ]

            resultados_lote = await asyncio.gather(*tarefas)
            resultados.extend(resultados_lote)

            if i + MAX_PARALELO < len(nomes_endpoints):
                await asyncio.sleep(DELAY_ENTRE_LOTES_MS / 1000)

        self.resultados.extend(resultados)
        return resultados

    async def consultar_por_modulo(
        self,
        modulo: str,
        opcoes: Optional[Dict[str, Any]] = None,
    ) -> List[ConsultaResultado]:
        """Consulta todos os endpoints de um módulo"""

        endpoints_modulo = [
            nome for nome, ep in self.catalogo.items()
            if ep.modulo == modulo
        ]

        if not endpoints_modulo:
            logger.warning(f"Nenhum endpoint encontrado para módulo: {modulo}")
            return []

        logger.info(f"Consultando módulo {modulo}: {len(endpoints_modulo)} endpoints")
        return await self.consultar_multiplos(endpoints_modulo, opcoes)

    async def consultar_periodo(
        self,
        data_inicio: str,  # "2026-09-01"
        data_fim: str,      # "2026-09-30"
    ) -> List[ConsultaResultado]:
        """Consulta endpoints que suportam filtro por data"""

        endpoints_com_data = [
            nome for nome, ep in self.catalogo.items()
            if any(p.get('tipo') == 'date' for p in ep.parametros.values())
        ]

        opcoes = {
            'data_inicio': data_inicio,
            'data_fim': data_fim,
        }

        logger.info(f"Consultando período {data_inicio} a {data_fim}: {len(endpoints_com_data)} endpoints")
        return await self.consultar_multiplos(endpoints_com_data, opcoes)

    async def fechar(self):
        """Fecha sessão HTTP (no-op para compatibilidade)"""
        pass

    def relatorio(self) -> Dict[str, Any]:
        """Gera relatório de execução"""
        sucesso = sum(1 for r in self.resultados if r.sucesso)
        falha = sum(1 for r in self.resultados if not r.sucesso)
        registros_total = sum(r.registrosTotais for r in self.resultados)
        tempo_total = sum(r.tempoMs for r in self.resultados)

        return {
            'total_consultadas': len(self.resultados),
            'sucesso': sucesso,
            'falha': falha,
            'taxa_sucesso_pct': (sucesso / len(self.resultados) * 100) if self.resultados else 0,
            'registros_total': registros_total,
            'tempo_total_ms': tempo_total,
            'tempo_medio_ms': tempo_total // len(self.resultados) if self.resultados else 0,
            'resultados': [asdict(r) for r in self.resultados],
        }

async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Compras.gov.br Consulta Collector")
    parser.add_argument("--schema", help="Caminho para schema JSON")
    parser.add_argument("--modulo", help="Módulo específico (ex: 01-PCA)")
    parser.add_argument("--data-inicio", help="Data início (YYYY-MM-DD)")
    parser.add_argument("--data-fim", help="Data fim (YYYY-MM-DD)")
    parser.add_argument("--output", help="Arquivo de saída JSON", default="comprasgov_resultado.json")

    args = parser.parse_args()

    collector = ConsultaComprasGovCollector(args.schema)

    try:
        if args.modulo:
            resultados = await collector.consultar_por_modulo(args.modulo)
        elif args.data_inicio and args.data_fim:
            resultados = await collector.consultar_periodo(args.data_inicio, args.data_fim)
        else:
            logger.error("Especifique --modulo ou --data-inicio e --data-fim")
            return 1

        relatorio = collector.relatorio()
        logger.info(f"Execução concluída: {relatorio['sucesso']}/{relatorio['total_consultadas']} sucesso")

        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(relatorio, f, indent=2, ensure_ascii=False)

        logger.info(f"Relatório salvo em {args.output}")

        return 0 if relatorio['falha'] == 0 else 1

    finally:
        await collector.fechar()

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

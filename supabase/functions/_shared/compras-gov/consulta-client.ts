import { ConsultaEndpoint, ConsultaOpcoes, ConsultaResultado } from "./consulta-types.ts";

/**
 * Cliente genérico para Compras.gov Consulta API
 * Consome os 77 endpoints organizados em 15 módulos.
 *
 * Estratégia:
 * - Históricos grandes (LEGADO, CONTRATAÇÕES, ARP, CONTRATOS): usar filtros de data
 * - Poll incremental via dt_alteracao/dataAtualizacaoPncp
 * - Respeitar limit de requisições (rate limiting)
 */
export class ConsultaComprasGovClient {
  private baseUrl: string;
  private timeout: number;
  private catalogoEndpoints: Map<string, ConsultaEndpoint>;

  constructor(baseUrl = "https://compras.gov.br/api/v1", timeout = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.catalogoEndpoints = new Map();
    this.inicializaCatalogo();
  }

  private inicializaCatalogo() {
    // TODO: carregar do schema JSON exportado
    // Por enquanto, placeholder vazio
    // Após extrair os 77 endpoints, mapear aqui
  }

  /**
   * Consulta um endpoint específico com paginação automática
   */
  async consultarEndpoint(
    nomeEndpoint: string,
    opcoes: ConsultaOpcoes = {},
  ): Promise<ConsultaResultado> {
    const inicio = Date.now();
    const resultado: ConsultaResultado = {
      modulo: opcoes.modulo || "desconhecido",
      endpoint: nomeEndpoint,
      registrosTotais: 0,
      registrosProcessados: 0,
      erros: [],
      tempoMs: 0,
      dataExecucao: new Date().toISOString(),
    };

    try {
      const endpoint = this.catalogoEndpoints.get(nomeEndpoint);
      if (!endpoint) {
        resultado.erros.push(`Endpoint não encontrado: ${nomeEndpoint}`);
        resultado.tempoMs = Date.now() - inicio;
        return resultado;
      }

      // Montagem de URL com parâmetros
      const url = this.montarUrl(endpoint, opcoes);
      const response = await this.fazer(url);

      // Tratamento de paginação
      const dados = await response.json();
      if (Array.isArray(dados)) {
        resultado.registrosTotais = dados.length;
        resultado.registrosProcessados = dados.length;
      } else if (dados.resultado && Array.isArray(dados.resultado)) {
        resultado.registrosTotais = dados.totalRegistros || dados.resultado.length;
        resultado.registrosProcessados = dados.resultado.length;
      }
    } catch (error) {
      resultado.erros.push(
        error instanceof Error ? error.message : String(error),
      );
    }

    resultado.tempoMs = Date.now() - inicio;
    return resultado;
  }

  /**
   * Consulta múltiplos endpoints com paralelismo limitado
   */
  async consultarMultiplos(
    endpoints: string[],
    opcoes: ConsultaOpcoes = {},
    maxParalelo = 3,
  ): Promise<ConsultaResultado[]> {
    const resultados: ConsultaResultado[] = [];

    for (let i = 0; i < endpoints.length; i += maxParalelo) {
      const lote = endpoints.slice(i, i + maxParalelo);
      const promessas = lote.map((ep) => this.consultarEndpoint(ep, opcoes));
      const resultadosLote = await Promise.all(promessas);
      resultados.push(...resultadosLote);

      // Pequeno delay entre lotes para respeitar rate limiting
      if (i + maxParalelo < endpoints.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return resultados;
  }

  /**
   * Poll incremental via data de atualização
   * Útil para tabelas históricas grandes
   */
  async consultarIncrementalPorData(
    nomeEndpoint: string,
    dataInicio: Date,
    dataFim: Date,
    opcoes: ConsultaOpcoes = {},
  ): Promise<ConsultaResultado> {
    return this.consultarEndpoint(nomeEndpoint, {
      ...opcoes,
      dataInicio: dataInicio.toISOString().split("T")[0],
      dataFim: dataFim.toISOString().split("T")[0],
    });
  }

  private montarUrl(endpoint: ConsultaEndpoint, opcoes: ConsultaOpcoes): string {
    let url = `${this.baseUrl}${endpoint.path}`;

    const params = new URLSearchParams();
    if (opcoes.dataInicio) params.set("dataInicio", opcoes.dataInicio);
    if (opcoes.dataFim) params.set("dataFim", opcoes.dataFim);
    if (opcoes.pagina) params.set("pagina", String(opcoes.pagina));
    if (opcoes.pageSize) params.set("pageSize", String(opcoes.pageSize));

    if (opcoes.filtros) {
      for (const [chave, valor] of Object.entries(opcoes.filtros)) {
        params.set(chave, String(valor));
      }
    }

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    return url;
  }

  private async fazer(url: string, metodo = "GET"): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: metodo,
        headers: {
          "Accept": "application/json",
          "User-Agent": "LicitaGym/1.0 (+https://licitagym.com)",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  registrarEndpoint(endpoint: ConsultaEndpoint) {
    this.catalogoEndpoints.set(endpoint.nome, endpoint);
  }

  listarEndpoints(): string[] {
    return Array.from(this.catalogoEndpoints.keys());
  }
}

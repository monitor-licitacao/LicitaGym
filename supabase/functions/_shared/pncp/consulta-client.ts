import { withRetry } from "./retry.ts";

const DEFAULT_BASE = "https://pncp.gov.br/api/consulta/v1";

/** Limites documentados em contract-matrix.md e statuslicitacoes.com.br/api-pncp */
export const CONSULTA_PAGE_SIZE = {
  contratacoes: { min: 10, max: 50, default: 50 },
  /** PCA exige mínimo 20 na prática (400 abaixo disso). */
  pca: { min: 20, max: 500, default: 50 },
  atasContratos: { min: 10, max: 500, default: 50 },
} as const;

export type ConsultaPage<T> = {
  data: T[];
  pagina: number;
  paginasRestantes: number;
  totalRegistros: number;
  raw: unknown;
};

export function clampConsultaPageSize(
  kind: keyof typeof CONSULTA_PAGE_SIZE,
  tamanhoPagina?: number,
): number {
  const { min, max, default: fallback } = CONSULTA_PAGE_SIZE[kind];
  const size = tamanhoPagina ?? fallback;
  return Math.max(min, Math.min(size, max));
}

export class PncpConsultaClient {
  constructor(private baseUrl = Deno.env.get("PNCP_CONSULTA_BASE") ?? DEFAULT_BASE) {}

  private buildUrl(path: string, params: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl.replace(/\/+$/, "")}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async parseBody<T>(response: Response): Promise<T> {
    // PNCP devolve 204 sem corpo quando não há resultados (statuslicitacoes.com.br/api-pncp).
    if (response.status === 204) return {} as T;
    const text = await response.text();
    if (!text.trim()) return {} as T;
    return JSON.parse(text) as T;
  }

  async getJson<T = unknown>(
    path: string,
    params: Record<string, string | number | undefined> = {},
  ): Promise<{ status: number; body: T; elapsedMs: number }> {
    const url = this.buildUrl(path, params);
    const started = Date.now();
    const response = await withRetry(async () => {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`PNCP consulta HTTP ${res.status}`);
      }
      return res;
    });
    const body = await this.parseBody<T>(response);
    return { status: response.status, body, elapsedMs: Date.now() - started };
  }

  extractList(body: unknown): unknown[] {
    if (Array.isArray(body)) return body;
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;
      for (const key of ["data", "content", "itens", "resultado"]) {
        if (Array.isArray(obj[key])) return obj[key] as unknown[];
      }
    }
    return [];
  }

  extractPagination(body: unknown, pagina: number): Omit<ConsultaPage<unknown>, "data" | "raw"> {
    const obj = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    return {
      pagina: Number(obj.pagina ?? pagina),
      paginasRestantes: Number(obj.paginasRestantes ?? 0),
      totalRegistros: Number(obj.totalRegistros ?? 0),
    };
  }

  async fetchPcaPage(
    anoPca: number,
    pagina: number,
    codigoClassificacaoSuperior: string,
    tamanhoPagina?: number,
  ) {
    return this.getJson("/pca/", {
      anoPca,
      pagina,
      codigoClassificacaoSuperior,
      tamanhoPagina: clampConsultaPageSize("pca", tamanhoPagina),
    });
  }

  async fetchContratacoesPublicacao(params: {
    dataInicial: string;
    dataFinal: string;
    codigoModalidadeContratacao: number;
    pagina: number;
    tamanhoPagina?: number;
  }) {
    const { tamanhoPagina, ...rest } = params;
    return this.getJson("/contratacoes/publicacao", {
      ...rest,
      tamanhoPagina: clampConsultaPageSize("contratacoes", tamanhoPagina),
    });
  }

  async fetchContratacoesAtualizacao(params: {
    dataInicial: string;
    dataFinal: string;
    codigoModalidadeContratacao: number;
    pagina: number;
    tamanhoPagina?: number;
  }) {
    const { tamanhoPagina, ...rest } = params;
    return this.getJson("/contratacoes/atualizacao", {
      ...rest,
      tamanhoPagina: clampConsultaPageSize("contratacoes", tamanhoPagina),
    });
  }

  async fetchAtas(params: {
    dataInicial: string;
    dataFinal: string;
    pagina: number;
    tamanhoPagina?: number;
  }) {
    const { tamanhoPagina, ...rest } = params;
    return this.getJson("/atas", {
      ...rest,
      tamanhoPagina: clampConsultaPageSize("atasContratos", tamanhoPagina),
    });
  }

  async fetchContratos(params: {
    dataInicial: string;
    dataFinal: string;
    pagina: number;
    tamanhoPagina?: number;
  }) {
    const { tamanhoPagina, ...rest } = params;
    return this.getJson("/contratos", {
      ...rest,
      tamanhoPagina: clampConsultaPageSize("atasContratos", tamanhoPagina),
    });
  }
}

export function formatPncpDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

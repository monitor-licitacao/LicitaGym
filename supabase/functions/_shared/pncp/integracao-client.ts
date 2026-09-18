import { withRetry } from "./retry.ts";

const DEFAULT_BASE = "https://pncp.gov.br/api/pncp/v1";

/** Cliente API integração — NÃO inclui /usuarios (CLA-40). */
export class PncpIntegracaoClient {
  constructor(private baseUrl = Deno.env.get("PNCP_INTEGRACAO_BASE") ?? DEFAULT_BASE) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = Deno.env.get("PNCP_INTEGRACAO_TOKEN")?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async getJson<T = unknown>(path: string): Promise<T> {
    const url = `${this.baseUrl.replace(/\/+$/, "")}${path}`;
    const response = await withRetry(async () => {
      const res = await fetch(url, { headers: this.headers() });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`PNCP integração HTTP ${res.status}`);
      }
      return res;
    });
    return (await response.json()) as T;
  }

  async getOrgao(cnpj: string) {
    return this.getJson(`/orgaos/${cnpj}`);
  }

  async getCatalogos() {
    return this.getJson("/catalogos");
  }

  async getCategoriaItemPcas() {
    return this.getJson("/categoriaItemPcas");
  }

  async getIrp(cnpj: string, ano: number, sequencial: number) {
    return this.getJson(`/orgaos/${cnpj}/irp/${ano}/${sequencial}`);
  }
}

// Tipos para API de Consulta do Compras.gov.br
// Schema extraído via análise OpenAPI dos 77 endpoints

export interface ConsultaEndpoint {
  modulo: string;
  nome: string;
  metodo: "GET" | "POST";
  path: string;
  urlCompleta: string;
  parametros: ConsultaParametro[];
  temPaginacao: boolean;
  temVarianteCsv: boolean;
  descricao?: string;
}

export interface ConsultaParametro {
  nome: string;
  tipo: "string" | "number" | "date" | "boolean" | "array";
  obrigatorio: boolean;
  descricao?: string;
}

export interface PaginacaoCompras {
  pagina?: number;
  pageSize?: number;
  resultado?: unknown[];
  totalRegistros?: number;
  totalPaginas?: number;
  paginasRestantes?: number;
}

export interface ConsultaOpcoes {
  modulo?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
  pageSize?: number;
  filtros?: Record<string, string | number | boolean>;
  timeout?: number;
}

export interface ConsultaResultado {
  modulo: string;
  endpoint: string;
  registrosTotais: number;
  registrosProcessados: number;
  erros: string[];
  tempoMs: number;
  dataExecucao: string;
}

// Dados do endpoint Licitação por ID (Legado)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-legado/1.1_consultarLicitacao_Id?id_compra=16800405901002024

export interface LicitacaoId {
  id_compra: string;
  identificador: string;
  numero_processo: string;
  uasg: number;
  modalidade: number;
  nome_modalidade: string;
  numero_aviso: number;
  situacao_aviso: string;
  tipo_pregao: string;
  tipo_recurso: string;
  nome_responsavel: string;
  funcao_responsavel: string;
  numero_itens: number | null;
  valor_estimado_total: number | null;
  valor_homologado_total: number | null;
  informacoes_gerais: string | null;
  objeto: string;
  endereco_entrega_edital: string;
  codigo_municipio_uasg: number;
  data_abertura_proposta: string;
  data_entrega_edital: string;
  data_entrega_proposta: string;
  data_publicacao: string;
  dt_alteracao: string;
  pertence14133: boolean;
}

export const licitacaoIdTestResults = [
  {
    endpoint: '/modulo-legado/1.1_consultarLicitacao_Id',
    testDate: new Date().toISOString(),
    parameters: {
      id_compra: '16800405901002024'
    },
    statusCode: 200,
    status: 'success' as const,
    message: 'Dados retornados com sucesso',
    totalRegistros: 1,
    totalPaginas: 1,
    paginasRestantes: 0,
    contentType: 'application/json'
  }
];

export const licitacaoIdAnalysis = {
  totalTests: licitacaoIdTestResults.length,
  successCount: 1,
  emptyCount: 0,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 100,
  conclusion: 'O endpoint Licitação por ID (Legado) está funcionando corretamente e retornando dados completos de uma licitação específica. O teste com id_compra=16800405901002024 retornou 1 registro com informações detalhadas sobre a licitação, incluindo modalidade, objeto, datas, responsável e UASG.',
  recommendation: 'O endpoint está operacional e pode ser utilizado para consultar licitações específicas por ID. Os dados retornados são completos e incluem todos os campos do schema. Este endpoint é útil quando se conhece o ID da licitação e deseja-se obter informações detalhadas.'
};

// Dados retornados
export const licitacaoIdSampleData: LicitacaoId[] = [
  {
    id_compra: "16800405901002024",
    identificador: "16800405901002024",
    numero_processo: "2024/000363-FPV",
    uasg: 168004,
    modalidade: 5,
    nome_modalidade: "PREGÃO",
    numero_aviso: 901002024,
    situacao_aviso: "Publicado",
    tipo_pregao: "eletronico",
    tipo_recurso: "Nacional",
    nome_responsavel: "LUCIO FERREIRA DE MEDEIROS",
    funcao_responsavel: "Ordenador de Despesas",
    numero_itens: null,
    valor_estimado_total: null,
    valor_homologado_total: null,
    informacoes_gerais: null,
    objeto: "Pregão Eletrônico Aquisição de Pallets Padrão Brasileiro (PBR) conforme condições, quantidades, exigências e estimativas, estabelecidas no edital.",
    endereco_entrega_edital: "Av.15 de Marco Bairro da Limeira - /SP",
    codigo_municipio_uasg: 68713,
    data_abertura_proposta: "2025-01-24",
    data_entrega_edital: "2025-01-02",
    data_entrega_proposta: "2025-01-02",
    data_publicacao: "2025-01-02",
    dt_alteracao: "2025-01-29T14:23:16",
    pertence14133: true
  }
];

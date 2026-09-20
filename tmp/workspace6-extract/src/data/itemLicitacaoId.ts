// Dados do endpoint Item de Licitação por ID (Legado)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-legado/2.1_consultarItemLicitacao_Id?id_compra=15301305000022002

export interface ItemLicitacaoId {
  numero_licitacao: string;
  uasg: number;
  nome_uasg: string;
  modalidade: number;
  nome_modalidade: string;
  numero_aviso: number;
  numero_item_licitacao: number;
  codigo_item_material: number;
  nome_material: string;
  codigo_item_servico: number | null;
  nome_servico: string | null;
  cnpj_fornecedor: string | null;
  nome_fornecedor: string | null;
  quantidade: number;
  unidade: string;
  descricao_item: string;
  beneficio: string;
  valor_estimado: number;
  decreto_7174: string;
  criterio_julgamento: string;
  cpf_vencedor: string;
  nome_vencedor_pf: string | null;
  sustentavel: number;
  dt_alteracao: string;
  id_compra: string;
  id_compra_item: string;
}

export const itemLicitacaoIdTestResults = [
  {
    endpoint: '/modulo-legado/2.1_consultarItemLicitacao_Id',
    testDate: new Date().toISOString(),
    parameters: {
      id_compra: '15301305000022002'
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

export const itemLicitacaoIdAnalysis = {
  totalTests: itemLicitacaoIdTestResults.length,
  successCount: 1,
  emptyCount: 0,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 100,
  conclusion: 'O endpoint Item de Licitação por ID (Legado) está funcionando corretamente e retornando dados completos de um item específico de uma licitação. O teste com id_compra=15301305000022002 retornou 1 registro com informações detalhadas sobre o item, incluindo material, quantidade, descrição e critérios de julgamento.',
  recommendation: 'O endpoint está operacional e pode ser utilizado para consultar itens específicos de licitações por ID da compra. Os dados retornados são completos e incluem todos os campos do schema. Este endpoint é útil quando se conhece o ID da compra e deseja-se obter informações detalhadas sobre os itens licitados.'
};

// Dados retornados
export const itemLicitacaoIdSampleData: ItemLicitacaoId[] = [
  {
    numero_licitacao: "153013052200235",
    uasg: 153013,
    nome_uasg: "CENTRO FED.DE EDUC.TECNOLOGICA-CEFET/MA",
    modalidade: 5,
    nome_modalidade: "PREGÃO",
    numero_aviso: 22002,
    numero_item_licitacao: 35,
    codigo_item_material: 28789,
    nome_material: "CANUDO REFRESCO, CANUDO DE REFRESCO NOME",
    codigo_item_servico: null,
    nome_servico: null,
    cnpj_fornecedor: null,
    nome_fornecedor: null,
    quantidade: 10,
    unidade: "PACOTES",
    descricao_item: "CANUDOS PLASTICOS DE REFRIGERANTE, PACOTE COM 100 UNIDADES",
    beneficio: "Nao possui tratamento diferenciado para ME/EPP/COOPERATIVA",
    valor_estimado: 0,
    decreto_7174: "false",
    criterio_julgamento: "Menor Valor",
    cpf_vencedor: "",
    nome_vencedor_pf: null,
    sustentavel: 0,
    dt_alteracao: "2023-05-03T21:47:00",
    id_compra: "15301305000022002",
    id_compra_item: "1530130500002200200035"
  }
];

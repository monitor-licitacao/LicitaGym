// Dados do endpoint Pregões (Legado)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-legado/3_consultarPregoes?pagina=1&tamanhoPagina=10&dt_data_edital_inicial=2025-01-01&dt_data_edital_final=2026-01-01

export interface Pregao {
  id_compra: string;
  co_processo: string;
  co_portaria: string;
  co_uasg: number;
  no_ausg: string;
  co_orgao: number;
  no_orgao: string;
  numero: number;
  ds_situacao_pregao: string;
  ds_tipo_pregao: string;
  ds_tipo_pregao_compra: string;
  tx_objeto: string;
  valor_estimado_total: string;
  valor_homologado_total: string;
  dt_portaria: string;
  dt_data_edital: string;
  dt_inicio_proposta: string;
  dt_fim_proposta: string;
  dt_alteracao: string;
  dt_encerramento: string;
  dt_resultado: string;
  pertence14133: boolean;
}

export const pregaoTestResults = [
  {
    endpoint: '/modulo-legado/3_consultarPregoes',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      tamanhoPagina: '10',
      dt_data_edital_inicial: '2025-01-01',
      dt_data_edital_final: '2026-01-01'
    },
    statusCode: 200,
    status: 'empty' as const,
    message: 'Nenhum registro encontrado para o período especificado',
    totalRegistros: 0,
    totalPaginas: 0,
    paginasRestantes: 0,
    contentType: 'application/json'
  }
];

export const pregaoAnalysis = {
  totalTests: pregaoTestResults.length,
  successCount: 0,
  emptyCount: 1,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 0,
  conclusion: 'O endpoint Pregões (Legado) está funcionando corretamente (status 200), mas não retornou dados para o período de 01/01/2025 a 01/01/2026. Isso pode indicar que não há pregões cadastrados nesse período específico, ou que os parâmetros de data precisam ser ajustados.',
  recommendation: 'O endpoint está operacional. Recomenda-se testar com diferentes períodos ou verificar se há pregões disponíveis. Os parâmetros disponíveis são: pagina, tamanhoPagina, dt_data_edital_inicial, dt_data_edital_final, co_uasg, co_orgao, ds_situacao_pregao e ds_tipo_pregao.'
};

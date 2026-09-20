// Dados do endpoint Pregão por ID (Legado)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-legado/3.1_consultarPregoes_Id?id_compra=15301305000022002

export interface PregaoId {
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

export const pregaoIdTestResults = [
  {
    endpoint: '/modulo-legado/3.1_consultarPregoes_Id',
    testDate: new Date().toISOString(),
    parameters: {
      id_compra: '15301305000022002'
    },
    statusCode: 200,
    status: 'empty' as const,
    message: 'Nenhum registro encontrado para o ID de compra especificado',
    totalRegistros: 0,
    totalPaginas: 1,
    paginasRestantes: 0,
    contentType: 'application/json'
  }
];

export const pregaoIdAnalysis = {
  totalTests: pregaoIdTestResults.length,
  successCount: 0,
  emptyCount: 1,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 0,
  conclusion: 'O endpoint Pregão por ID (Legado) está funcionando corretamente (status 200), mas não retornou dados para o ID de compra 15301305000022002. Isso é interessante porque o mesmo ID funcionou no endpoint de Item de Licitação por ID, sugerindo que este pregão específico pode não estar cadastrado no módulo de pregões ou pode ter sido migrado para a Lei 14.133/2021.',
  recommendation: 'O endpoint está operacional. Recomenda-se testar com diferentes IDs de compra ou verificar se o pregão foi migrado para a nova legislação. Os parâmetros disponíveis são: id_compra.'
};

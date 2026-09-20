// Dados do endpoint Órgão (Inativos)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-uasg/2_consultarOrgao?pagina=1&statusOrgao=false

export const orgaoFalseTestResults = [
  {
    endpoint: '/modulo-uasg/2_consultarOrgao',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      statusOrgao: 'false'
    },
    statusCode: 200,
    status: 'empty' as const,
    message: 'Nenhum registro encontrado',
    totalRegistros: 0,
    totalPaginas: 0,
    paginasRestantes: 0,
    contentType: 'application/json'
  }
];

export const orgaoFalseAnalysis = {
  totalTests: orgaoFalseTestResults.length,
  successCount: 0,
  emptyCount: 1,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 0,
  conclusion: 'O endpoint Órgão está funcionando corretamente (status 200), mas não retornou dados para órgãos inativos (statusOrgao=false). Isso pode indicar que não há órgãos inativos cadastrados no sistema, ou que todos os órgãos estão ativos.',
  recommendation: 'O endpoint está operacional. Recomenda-se testar com outros parâmetros ou verificar se há órgãos inativos no sistema. Os parâmetros disponíveis são: pagina, codigoOrgao, usoSisg, cnpjCpfOrgao, cnpjCpfOrgaoVinculado, cnpjCpfOrgaoSuperior e statusOrgao.'
};

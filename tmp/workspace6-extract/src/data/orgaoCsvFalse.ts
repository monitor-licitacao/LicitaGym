// Dados do endpoint Órgão CSV (Inativos)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-uasg/2.1_consultarOrgao_CSV?pagina=1&statusOrgao=false

export const orgaoCsvFalseTestResults = [
  {
    endpoint: '/modulo-uasg/2.1_consultarOrgao_CSV',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      statusOrgao: 'false'
    },
    statusCode: 500,
    status: 'error' as const,
    message: 'Internal Server Error',
    contentLength: 0,
    contentType: 'text/csv',
    filename: 'consultarOrgaoCSV.csv',
    headers: {}
  }
];

export const orgaoCsvFalseAnalysis = {
  totalTests: orgaoCsvFalseTestResults.length,
  successCount: 0,
  emptyCount: 0,
  errorCount: 1,
  notFoundCount: 0,
  successRate: 0,
  conclusion: 'O endpoint CSV do Órgão retornou erro 500 (Internal Server Error) quando chamado com statusOrgao=false. Isso indica um problema no servidor ao processar a requisição para órgãos inativos em formato CSV. O endpoint funciona corretamente com statusOrgao=true, mas falha com statusOrgao=false.',
  recommendation: 'O endpoint está com problemas para órgãos inativos. Recomenda-se utilizar o endpoint JSON (/modulo-uasg/2_consultarOrgao?statusOrgao=false) que funciona corretamente e retorna 0 registros (indicando que não há órgãos inativos cadastrados). Alternativamente, pode-se aguardar a correção do endpoint CSV pela equipe do Compras.gov.br.'
};

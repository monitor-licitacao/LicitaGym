// Dados do endpoint UASG CSV com statusUasg=false
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-uasg/1.1_consultarUasg_CSV?pagina=1&statusUasg=false

export const uasgCsvFalseTestResults = [
  {
    endpoint: '/modulo-uasg/1.1_consultarUasg_CSV',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      statusUasg: 'false'
    },
    statusCode: 500,
    status: 'error' as const,
    message: 'Internal Server Error',
    contentLength: 0,
    contentType: 'text/csv',
    filename: 'consultarUasgCSV.csv',
    headers: {}
  }
];

export const uasgCsvFalseAnalysis = {
  totalTests: uasgCsvFalseTestResults.length,
  successCount: 0,
  emptyCount: 0,
  errorCount: 1,
  notFoundCount: 0,
  successRate: 0,
  conclusion: 'O endpoint CSV do UASG retornou erro 500 (Internal Server Error) quando chamado com statusUasg=false. Isso indica um problema no servidor ao processar a requisição para UASGs inativas em formato CSV. O endpoint funciona corretamente com statusUasg=true, mas falha com statusUasg=false.',
  recommendation: 'O endpoint está com problemas para UASGs inativas. Recomenda-se utilizar o endpoint JSON (/modulo-uasg/1_consultarUasg?statusUasg=false) que funciona corretamente e retorna 100 registros de UASGs inativas. Alternativamente, pode-se aguardar a correção do endpoint CSV pela equipe do Compras.gov.br.'
};

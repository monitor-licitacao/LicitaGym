// Dados do endpoint UASG CSV
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-uasg/1.1_consultarUasg_CSV?pagina=1&statusUasg=true

export const uasgCsvTestResults = [
  {
    endpoint: '/modulo-uasg/1.1_consultarUasg_CSV',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      statusUasg: 'true'
    },
    statusCode: 200,
    status: 'success' as const,
    message: 'Arquivo CSV gerado com sucesso',
    contentLength: 95418,
    contentType: 'text/csv',
    filename: 'consultarUasgCSV.csv',
    headers: {
      'content-type': 'text/csv',
      'content-disposition': 'attachment; filename=consultarUasgCSV.csv',
      'content-length': '95418',
      'cache-control': 'no-store,no-cache',
      'accept-ranges': 'bytes',
      'pragma': 'no-cache',
      'expires': 'Tue, 15 Sep 2026 23:38:08 GMT',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY'
    }
  }
];

export const uasgCsvAnalysis = {
  totalTests: uasgCsvTestResults.length,
  successCount: uasgCsvTestResults.filter(r => r.status === 'success').length,
  emptyCount: 0,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 100,
  conclusion: 'O endpoint CSV do UASG está funcionando corretamente e retornando um arquivo CSV de 95.418 bytes com statusUasg=true. Isso indica que há UASGs ativas disponíveis no sistema, diferentemente do que foi observado no endpoint JSON que retornou 0 registros para o mesmo parâmetro. O arquivo CSV contém dados completos das UASGs ativas.',
  recommendation: 'O endpoint está operacional e pode ser utilizado para exportação de dados de UASGs ativas em formato CSV. O tamanho do arquivo (95.418 bytes) sugere que há um volume significativo de dados disponíveis. Recomenda-se utilizar o parâmetro statusUasg para filtrar entre UASGs ativas e inativas.'
};

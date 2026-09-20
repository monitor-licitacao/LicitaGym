// Dados de teste do endpoint PGC CSV (Plano de Gerenciamento de Contratações - CSV)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pgc/1.1_consultarPgcDetalhe_CSV

type TestStatus = 'success' | 'empty' | 'error' | 'not_found';

export const pgcCsvTestResults: Array<{
  endpoint: string;
  testDate: string;
  parameters: Record<string, string>;
  statusCode: number;
  status: TestStatus;
  message: string;
  contentLength?: number;
  contentType?: string;
  filename?: string;
  headers?: Record<string, string>;
}> = [
  {
    endpoint: '/modulo-pgc/1.1_consultarPgcDetalhe_CSV',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      tamanhoPagina: '10',
      orgao: 'Câmara Municipal de Barueri',
      anoPcaProjetoCompra: '2025'
    },
    statusCode: 200,
    status: 'success',
    message: 'Arquivo CSV gerado com sucesso',
    contentLength: 1298,
    contentType: 'text/csv',
    filename: 'consultarPgcDetalheCSV.csv',
    headers: {
      'content-type': 'text/csv',
      'content-disposition': 'attachment; filename=consultarPgcDetalheCSV.csv',
      'content-length': '1298',
      'cache-control': 'no-store,no-cache',
      'accept-ranges': 'bytes',
      'pragma': 'no-cache',
      'expires': 'Tue, 15 Sep 2026 18:59:26 GMT',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY'
    }
  }
];

export const pgcCsvAnalysis = {
  totalTests: pgcCsvTestResults.length,
  successCount: pgcCsvTestResults.filter(r => r.status === 'success').length,
  emptyCount: pgcCsvTestResults.filter(r => r.status === 'empty').length,
  errorCount: pgcCsvTestResults.filter(r => r.status === 'error').length,
  notFoundCount: pgcCsvTestResults.filter(r => r.status === 'not_found').length,
  successRate: 100,
  conclusion: 'O endpoint CSV do PGC está funcionando corretamente quando chamado com os parâmetros adequados (orgao e anoPcaProjetoCompra). O endpoint retornou um arquivo CSV com 1298 bytes, confirmando que a implementação está operacional.',
  recommendation: 'O endpoint está operacional e pode ser utilizado para exportação de dados em formato CSV. Recomenda-se utilizar os parâmetros orgao e anoPcaProjetoCompra para filtrar os dados desejados.'
};

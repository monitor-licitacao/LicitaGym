// Dados de teste do endpoint PGC Agregação CSV
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pgc/3.1_consultarPgcAgregacao_CSV
// Parâmetros: pagina=1&orgao=Prefeitura Municipal de Porto Belo&ano=2026

export const pgcAgregacaoCsvTestResults = [
  {
    endpoint: '/modulo-pgc/3.1_consultarPgcAgregacao_CSV',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      orgao: 'Prefeitura Municipal de Porto Belo',
      ano: '2026'
    },
    statusCode: 200,
    status: 'success' as const,
    message: 'Arquivo CSV gerado com sucesso',
    contentLength: 300,
    contentType: 'text/csv',
    filename: 'consultarPgcAgregacaoCSV.csv',
    headers: {
      'content-type': 'text/csv',
      'content-disposition': 'attachment; filename=consultarPgcAgregacaoCSV.csv',
      'content-length': '300',
      'cache-control': 'no-store,no-cache',
      'accept-ranges': 'bytes',
      'pragma': 'no-cache',
      'expires': 'Tue, 15 Sep 2026 23:09:52 GMT',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY'
    }
  }
];

export const pgcAgregacaoCsvAnalysis = {
  totalTests: pgcAgregacaoCsvTestResults.length,
  successCount: pgcAgregacaoCsvTestResults.filter(r => r.status === 'success').length,
  emptyCount: 0,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 100,
  conclusion: 'O endpoint CSV do PGC Agregação está funcionando corretamente e retornando um arquivo CSV de 300 bytes. Observação importante: enquanto o endpoint JSON (3_consultarPgcAgregacao) retornou 0 registros para os mesmos parâmetros, o endpoint CSV retornou um arquivo com conteúdo (300 bytes). Isso sugere que o CSV pode incluir cabeçalhos ou dados de estrutura mesmo quando não há registros de dados, ou que há uma diferença no processamento entre os dois endpoints.',
  recommendation: 'O endpoint está operacional e pode ser utilizado para exportação de dados em formato CSV. O tamanho reduzido do arquivo (300 bytes) sugere que contém principalmente cabeçalhos ou poucos registros. Recomenda-se testar com outros órgãos ou anos para verificar a disponibilidade de dados mais completos.'
};

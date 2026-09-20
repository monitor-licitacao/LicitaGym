// Dados de teste do endpoint PGC Detalhe Catálogo CSV
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pgc/2.1_consultarPgcDetalheCatalogo_CSV
// Parâmetros: pagina=1&tamanhoPagina=100&anoPcaProjetoCompra=2026&tipo=Material&codigo=1005

export const pgcDetalheCatalogoCsvTestResults = [
  {
    endpoint: '/modulo-pgc/2.1_consultarPgcDetalheCatalogo_CSV',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      tamanhoPagina: '100',
      anoPcaProjetoCompra: '2026',
      tipo: 'Material',
      codigo: '1005'
    },
    statusCode: 200,
    status: 'success' as const,
    message: 'Arquivo CSV gerado com sucesso',
    contentLength: 82739,
    contentType: 'text/csv',
    filename: 'consultarPgcDetalheCatalogoCSV.csv',
    headers: {
      'content-type': 'text/csv',
      'content-disposition': 'attachment; filename=consultarPgcDetalheCatalogoCSV.csv',
      'content-length': '82739',
      'cache-control': 'no-store,no-cache',
      'accept-ranges': 'bytes',
      'pragma': 'no-cache',
      'expires': 'Tue, 15 Sep 2026 22:34:55 GMT',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY'
    }
  }
];

export const pgcDetalheCatalogoCsvAnalysis = {
  totalTests: pgcDetalheCatalogoCsvTestResults.length,
  successCount: pgcDetalheCatalogoCsvTestResults.filter(r => r.status === 'success').length,
  emptyCount: 0,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 100,
  conclusion: 'O endpoint CSV do PGC Catálogo está funcionando corretamente e retornando um arquivo CSV de 82.739 bytes. Isso indica que há múltiplos registros de materiais vinculados a Projetos de Compra Anual de 2026 para o código de classe 1005. O arquivo está disponível para download no formato CSV.',
  recommendation: 'O endpoint está operacional e pode ser utilizado para exportação de dados em formato CSV. O tamanho do arquivo (82.739 bytes) sugere que há um volume significativo de dados disponíveis para o ano de 2026. Recomenda-se utilizar os parâmetros anoPcaProjetoCompra, tipo e codigo para filtrar os dados desejados.'
};

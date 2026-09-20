// Teste do endpoint CSV de Detalhes de Material
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/2.1_consultarMaterialDetalhe_CSV
// Status: ⚠️ ENDPOINT COM PROBLEMAS

export interface CsvDetalheTestResult {
  endpoint: string;
  testDate: string;
  statusCode: number | null;
  status: 'success' | 'error' | 'not_found';
  message: string;
  parameters: Record<string, string>;
}

export const csvDetalheTestResults: CsvDetalheTestResult[] = [
  {
    endpoint: '/modulo-pesquisa-preco/2.1_consultarMaterialDetalhe_CSV',
    testDate: new Date().toISOString(),
    statusCode: 500,
    status: 'error',
    message: 'Internal Server Error',
    parameters: {
      pagina: '1',
      tamanhoPagina: '100'
    }
  },
  {
    endpoint: '/modulo-pesquisa-preco/2.1_consultarMaterialDetalhe_CSV',
    testDate: new Date().toISOString(),
    statusCode: 500,
    status: 'error',
    message: 'Internal Server Error',
    parameters: {
      pagina: '1',
      tamanhoPagina: '100',
      codigoItemCatalogo: '233523'
    }
  }
];

// Análise do problema
export const csvDetalheAnalysis = {
  totalTests: csvDetalheTestResults.length,
  successCount: csvDetalheTestResults.filter(r => r.status === 'success').length,
  errorCount: csvDetalheTestResults.filter(r => r.status === 'error').length,
  notFoundCount: csvDetalheTestResults.filter(r => r.status === 'not_found').length,
  successRate: 0,
  conclusion: 'O endpoint CSV de detalhes está com problemas consistentes. Retorna 500 (Internal Server Error) tanto com quanto sem parâmetros de filtro.',
  recommendation: 'Recomenda-se usar o endpoint JSON (/modulo-pesquisa-preco/2_consultarMaterialDetalhe) e converter para CSV no lado do cliente, ou aguardar correção do endpoint CSV pela equipe do Compras.gov.br.'
};

// Comparação com endpoint JSON
export const jsonDetalheEndpointComparison = {
  endpoint: '/modulo-pesquisa-preco/2_consultarMaterialDetalhe',
  status: '✅ FUNCIONANDO',
  testResult: {
    codigoItemCatalogo: '233523',
    totalRegistros: 25,
    totalPaginas: 3,
    statusCode: 200
  },
  note: 'O endpoint JSON funciona corretamente e retorna os mesmos dados que o CSV deveria retornar, mas em formato JSON.'
};

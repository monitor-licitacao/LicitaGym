// Teste do endpoint CSV de Pesquisa de Preço de Material
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1.1_consultarMaterial_CSV
// Status: ⚠️ ENDPOINT COM PROBLEMAS

export interface CsvTestResult {
  endpoint: string;
  testDate: string;
  statusCode: number | null;
  status: 'success' | 'error' | 'not_found';
  message: string;
  parameters: Record<string, string>;
}

export const csvTestResults: CsvTestResult[] = [
  {
    endpoint: '/modulo-pesquisa-preco/1.1_consultarMaterial_CSV',
    testDate: new Date().toISOString(),
    statusCode: 500,
    status: 'error',
    message: 'Internal Server Error',
    parameters: {
      pagina: '1',
      tamanhoPagina: '10',
      tipo: 'codigoPdm',
      codigo: '313',
      dataResultado: 'false'
    }
  },
  {
    endpoint: '/modulo-pesquisa-preco/1.1_consultarMaterial_CSV',
    testDate: new Date().toISOString(),
    statusCode: 500,
    status: 'error',
    message: 'Internal Server Error',
    parameters: {
      pagina: '1',
      tamanhoPagina: '10',
      tipo: 'codigoPdm',
      codigo: '104217',
      dataResultado: 'false'
    }
  },
  {
    endpoint: '/modulo-pesquisa-preco/1.1_consultarMaterial_CSV',
    testDate: new Date().toISOString(),
    statusCode: 404,
    status: 'not_found',
    message: 'Resource not found',
    parameters: {
      pagina: '1',
      tamanhoPagina: '10'
    }
  },
  {
    endpoint: '/modulo-pesquisa-preco/1.1_consultarMaterial_CSV',
    testDate: new Date().toISOString(),
    statusCode: 404,
    status: 'not_found',
    message: 'Resource not found',
    parameters: {
      pagina: '1'
    }
  }
];

// Análise do problema
export const csvAnalysis = {
  totalTests: csvTestResults.length,
  successCount: csvTestResults.filter(r => r.status === 'success').length,
  errorCount: csvTestResults.filter(r => r.status === 'error').length,
  notFoundCount: csvTestResults.filter(r => r.status === 'not_found').length,
  successRate: 0,
  conclusion: 'O endpoint CSV está com problemas consistentes. Retorna 500 (Internal Server Error) quando recebe parâmetros de filtro e 404 (Not Found) quando chamado sem parâmetros.',
  recommendation: 'Recomenda-se usar o endpoint JSON (/modulo-pesquisa-preco/1_consultarMaterial) e converter para CSV no lado do cliente, ou aguardar correção do endpoint CSV pela equipe do Compras.gov.br.'
};

// Comparação com endpoint JSON
export const jsonEndpointComparison = {
  endpoint: '/modulo-pesquisa-preco/1_consultarMaterial',
  status: '✅ FUNCIONANDO',
  testResult: {
    codigoPdm: '313',
    totalRegistros: 11464,
    totalPaginas: 1147,
    statusCode: 200
  },
  note: 'O endpoint JSON funciona corretamente e retorna os mesmos dados que o CSV deveria retornar, mas em formato JSON.'
};

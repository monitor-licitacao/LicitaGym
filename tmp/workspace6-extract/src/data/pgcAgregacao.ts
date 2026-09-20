// Dados de teste do endpoint PGC Agregação
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pgc/3_consultarPgcAgregacao
// Parâmetros: pagina=1&orgao=Prefeitura Municipal de Porto Belo&ano=2026

export interface PgcAgregacao {
  orgao: string;
  ano: number;
  poder: string;
  esfera: string;
  dataHoraPublicacaoPncp: string;
  dataHoraAtualizacao: string;
  quantidadeTotalItens: number;
  valorTotalEstimado: number;
}

export const pgcAgregacaoTestResults = [
  {
    endpoint: '/modulo-pgc/3_consultarPgcAgregacao',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      orgao: 'Prefeitura Municipal de Porto Belo',
      ano: '2026'
    },
    statusCode: 200,
    status: 'empty' as const,
    message: 'Nenhum registro encontrado para os parâmetros fornecidos',
    totalRegistros: 0,
    totalPaginas: 0,
    paginasRestantes: 0,
    contentType: 'application/json'
  }
];

export const pgcAgregacaoAnalysis = {
  totalTests: pgcAgregacaoTestResults.length,
  successCount: 0,
  emptyCount: 1,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 0,
  conclusion: 'O endpoint PGC Agregação está funcionando corretamente (status 200), mas não retornou dados para os parâmetros testados (Prefeitura Municipal de Porto Belo, ano 2026). Isso pode indicar que não há dados de agregação disponíveis para este órgão específico no ano de 2026, ou que os dados ainda não foram publicados.',
  recommendation: 'O endpoint está operacional. Recomenda-se testar com outros órgãos ou anos para verificar a disponibilidade de dados. Os parâmetros disponíveis são: pagina, orgao (nome do órgão) e ano (ano de referência).'
};
